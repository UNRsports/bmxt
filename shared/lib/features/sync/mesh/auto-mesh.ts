/**
 * EN: After a manual handshake with any Family member, complete a full mesh by
 *     announcing live peers and relaying directed offer/answer one hop.
 * JA: Family の誰か1台と手動握手したあと、生存 peer の広告と1ホップ中継で
 *     directed offer/answer を回しフルメッシュを完成させる。
 */

import { bytesToBase64Url, randomBytes } from "../crypto/bytes.ts"
import { loadOrCreateDeviceIdentity } from "../device/device-identity.ts"
import { loadFamilyMembership } from "../device/family-membership.ts"
import { loadLocalRoster, upsertLocalRosterMember } from "../adapters/local-roster-store.ts"
import type { CommandBusStabilizer } from "../stabilizers/command-bus.ts"
import type { DiscoveryStabilizer } from "../stabilizers/discovery.ts"
import type { PeerHostStabilizer } from "../stabilizers/peer-host.ts"
import type { SyncBusCommand, SyncDeviceId } from "../types.ts"
import { peersToAnnounce, peersToOfferMesh } from "./mesh-plan.ts"
import { refreshSyncLinkStatusFromBus } from "../link/sync-link-bridge.ts"

const MAX_MESH_PEERS = 32
const MAX_SDP_CHARS = 32_000
const MAX_ICE = 64
const MAX_ICE_ITEM = 4096
const MESH_OFFER_BUSY_TTL_MS = 60_000

type AutoMeshDeps = {
  peerHost: PeerHostStabilizer
  commandBus: CommandBusStabilizer
  discovery: DiscoveryStabilizer
}

function isConnectedRaw(raw: string): boolean {
  return raw === "connected"
}

function isBusyRaw(raw: string): boolean {
  return raw === "connected" || raw === "connecting" || raw === "checking"
}

function validateMeshSignalShape(command: Extract<SyncBusCommand, { type: "mesh_signal" }>): boolean {
  if (command.targetDeviceId.trim().length < 8) {
    return false
  }
  if (command.originDeviceId.trim().length < 8) {
    return false
  }
  if (command.sessionId.length < 8 || command.sessionId.length > 64) {
    return false
  }
  if (command.familyId.trim().length < 8) {
    return false
  }
  if (command.sdp.length === 0 || command.sdp.length > MAX_SDP_CHARS) {
    return false
  }
  if (!Array.isArray(command.ice) || command.ice.length > MAX_ICE) {
    return false
  }
  for (const item of command.ice) {
    if (typeof item !== "string" || item.length === 0 || item.length > MAX_ICE_ITEM) {
      return false
    }
  }
  return command.role === "offer" || command.role === "answer"
}

/**
 * EN: Wire automatic mesh completion into the in-page SyncService (idempotent).
 * JA: プロンプト内 SyncService へ自動メッシュ補完を配線（冪等）。
 */
export function installAutoMesh(deps: AutoMeshDeps): void {
  const globalRef = globalThis as typeof globalThis & {
    __bmxt_auto_mesh_installed__?: boolean
  }
  if (globalRef.__bmxt_auto_mesh_installed__) {
    return
  }
  globalRef.__bmxt_auto_mesh_installed__ = true

  /** EN: remoteId → introducer (relay) device id */
  const relayByRemote = new Map<SyncDeviceId, SyncDeviceId>()
  /** EN: remotes we already started a directed offer for (until connected / timeout) */
  const offerBusyUntil = new Map<SyncDeviceId, number>()
  let lastConnectedKey = ""

  async function displayNameOf(deviceId: SyncDeviceId): Promise<string> {
    const roster = await loadLocalRoster()
    const fromRoster = roster?.members.find((m) => m.deviceId === deviceId)
    if (fromRoster !== undefined) {
      return fromRoster.displayName
    }
    const known = await deps.discovery.listKnown()
    const hit = known.find((d) => d.deviceId === deviceId)
    if (hit !== undefined) {
      return hit.displayName
    }
    return deviceId
  }

  function connectedIdsNow(selfDeviceId: SyncDeviceId): SyncDeviceId[] {
    const ids: SyncDeviceId[] = []
    for (const remoteId of deps.peerHost.listBoundRemoteDeviceIds()) {
      if (remoteId === selfDeviceId) {
        continue
      }
      if (isConnectedRaw(deps.peerHost.getConnectionState(remoteId))) {
        ids.push(remoteId)
      }
    }
    return ids
  }

  function busySet(selfDeviceId: SyncDeviceId): Set<SyncDeviceId> {
    const set = new Set<SyncDeviceId>()
    const now = Date.now()
    for (const [id, until] of offerBusyUntil) {
      if (until <= now) {
        offerBusyUntil.delete(id)
        continue
      }
      set.add(id)
    }
    for (const remoteId of deps.peerHost.listBoundRemoteDeviceIds()) {
      if (remoteId === selfDeviceId) {
        continue
      }
      if (isBusyRaw(deps.peerHost.getConnectionState(remoteId))) {
        set.add(remoteId)
      }
    }
    return set
  }

  async function rememberPeer(deviceId: SyncDeviceId, displayName: string): Promise<void> {
    const membership = await loadFamilyMembership()
    if (membership === null) {
      return
    }
    const name = displayName.trim().length > 0 ? displayName.trim() : deviceId
    await deps.discovery.rememberManual({
      deviceId,
      displayName: name,
      familyId: membership.familyId,
      endpointHint: null,
      discoveredAt: new Date().toISOString(),
      source: "manual"
    })
    await upsertLocalRosterMember({
      deviceId,
      displayName: name,
      browser: "unknown",
      familyId: membership.familyId,
      updatedAt: new Date().toISOString(),
      endpointHint: null
    })
  }

  async function sendTo(remoteId: SyncDeviceId, command: SyncBusCommand): Promise<boolean> {
    return deps.peerHost.sendCommand(remoteId, command)
  }

  async function announceToNeighbor(neighborId: SyncDeviceId): Promise<void> {
    const device = await loadOrCreateDeviceIdentity()
    const connected = connectedIdsNow(device.deviceId)
    const peers = peersToAnnounce({
      selfDeviceId: device.deviceId,
      neighborDeviceId: neighborId,
      connectedIds: connected,
      displayNameOf: (id) => id
    })
    // EN: Resolve display names asynchronously for the announce payload.
    const named: Array<{ deviceId: SyncDeviceId; displayName: string }> = []
    for (const peer of peers.slice(0, MAX_MESH_PEERS)) {
      named.push({
        deviceId: peer.deviceId,
        displayName: await displayNameOf(peer.deviceId)
      })
    }
    const command: SyncBusCommand = {
      type: "mesh_peers",
      id: bytesToBase64Url(randomBytes(8)),
      from: device.deviceId,
      peers: named
    }
    await sendTo(neighborId, command)
  }

  async function startDirectedOffer(args: {
    remoteDeviceId: SyncDeviceId
    remoteDisplayName: string
    relayDeviceId: SyncDeviceId
  }): Promise<void> {
    const device = await loadOrCreateDeviceIdentity()
    const membership = await loadFamilyMembership()
    if (membership === null) {
      return
    }
    if (args.remoteDeviceId === device.deviceId) {
      return
    }
    if (busySet(device.deviceId).has(args.remoteDeviceId)) {
      return
    }
    offerBusyUntil.set(args.remoteDeviceId, Date.now() + MESH_OFFER_BUSY_TTL_MS)
    relayByRemote.set(args.remoteDeviceId, args.relayDeviceId)
    await rememberPeer(args.remoteDeviceId, args.remoteDisplayName)
    let bundle: { sessionId: string; sdp: string; ice: string[] }
    try {
      bundle = await deps.peerHost.createDirectedOfferHandshake(args.remoteDeviceId)
    } catch {
      offerBusyUntil.delete(args.remoteDeviceId)
      return
    }
    const signal: SyncBusCommand = {
      type: "mesh_signal",
      id: bytesToBase64Url(randomBytes(8)),
      from: device.deviceId,
      targetDeviceId: args.remoteDeviceId,
      originDeviceId: device.deviceId,
      originDisplayName: device.displayName,
      familyId: membership.familyId,
      role: "offer",
      sessionId: bundle.sessionId,
      sdp: bundle.sdp,
      ice: bundle.ice
    }
    const sent = await sendTo(args.relayDeviceId, signal)
    if (!sent) {
      offerBusyUntil.delete(args.remoteDeviceId)
      await deps.peerHost.closeSession(args.remoteDeviceId)
    }
  }

  async function handleMeshPeers(command: Extract<SyncBusCommand, { type: "mesh_peers" }>): Promise<void> {
    const device = await loadOrCreateDeviceIdentity()
    const introducer = command.from
    const announced = command.peers.slice(0, MAX_MESH_PEERS)
    for (const peer of announced) {
      if (peer.deviceId === device.deviceId) {
        continue
      }
      relayByRemote.set(peer.deviceId, introducer)
      await rememberPeer(peer.deviceId, peer.displayName)
    }
    const targets = peersToOfferMesh({
      selfDeviceId: device.deviceId,
      announced,
      alreadyConnectedOrBusy: busySet(device.deviceId)
    })
    for (const target of targets) {
      await startDirectedOffer({
        remoteDeviceId: target.deviceId,
        remoteDisplayName: target.displayName,
        relayDeviceId: introducer
      })
    }
  }

  async function handleMeshSignal(
    command: Extract<SyncBusCommand, { type: "mesh_signal" }>
  ): Promise<void> {
    if (!validateMeshSignalShape(command)) {
      return
    }
    const device = await loadOrCreateDeviceIdentity()
    const membership = await loadFamilyMembership()
    if (membership === null || command.familyId !== membership.familyId) {
      return
    }

    // EN: Forward one hop if we are not the final target and have a live DC.
    if (command.targetDeviceId !== device.deviceId) {
      if (command.targetDeviceId === command.from) {
        return
      }
      if (!isConnectedRaw(deps.peerHost.getConnectionState(command.targetDeviceId))) {
        return
      }
      const hop: SyncBusCommand = {
        ...command,
        id: bytesToBase64Url(randomBytes(8)),
        from: device.deviceId
      }
      await sendTo(command.targetDeviceId, hop)
      return
    }

    if (command.role === "offer") {
      if (busySet(device.deviceId).has(command.originDeviceId)) {
        if (isConnectedRaw(deps.peerHost.getConnectionState(command.originDeviceId))) {
          return
        }
      }
      await rememberPeer(command.originDeviceId, command.originDisplayName)
      relayByRemote.set(command.originDeviceId, command.from)
      let accepted: {
        sessionId: string
        sdp: string
        ice: string[]
        remoteDeviceId: SyncDeviceId
      }
      try {
        accepted = await deps.peerHost.acceptOfferHandshake({
          v: 1,
          role: "offer",
          sessionId: command.sessionId,
          fromDeviceId: command.originDeviceId,
          fromDisplayName: command.originDisplayName,
          familyId: command.familyId,
          toDeviceId: device.deviceId,
          sdp: command.sdp,
          ice: command.ice
        })
      } catch {
        return
      }
      deps.commandBus.discardState("pending-offer")
      await deps.commandBus.connect(accepted.remoteDeviceId)
      const answer: SyncBusCommand = {
        type: "mesh_signal",
        id: bytesToBase64Url(randomBytes(8)),
        from: device.deviceId,
        targetDeviceId: command.originDeviceId,
        originDeviceId: device.deviceId,
        originDisplayName: device.displayName,
        familyId: membership.familyId,
        role: "answer",
        sessionId: accepted.sessionId,
        sdp: accepted.sdp,
        ice: accepted.ice
      }
      // EN: Reply via the hop we received from (introducer / previous relay).
      await sendTo(command.from, answer)
      await refreshSyncLinkStatusFromBus()
      return
    }

    // answer
    try {
      await deps.peerHost.applyAnswerHandshake({
        v: 1,
        role: "answer",
        sessionId: command.sessionId,
        fromDeviceId: command.originDeviceId,
        fromDisplayName: command.originDisplayName,
        familyId: command.familyId,
        toDeviceId: device.deviceId,
        sdp: command.sdp,
        ice: command.ice
      })
    } catch {
      offerBusyUntil.delete(command.originDeviceId)
      return
    }
    offerBusyUntil.delete(command.originDeviceId)
    deps.commandBus.discardState("pending-offer")
    await deps.commandBus.connect(command.originDeviceId)
    await rememberPeer(command.originDeviceId, command.originDisplayName)
    await refreshSyncLinkStatusFromBus()
  }

  async function onConnectedSetChanged(): Promise<void> {
    const device = await loadOrCreateDeviceIdentity()
    const connected = connectedIdsNow(device.deviceId).sort()
    const key = connected.join(",")
    if (key === lastConnectedKey) {
      return
    }
    const prev = new Set(
      lastConnectedKey.length === 0 ? [] : lastConnectedKey.split(",").filter((s) => s.length > 0)
    )
    lastConnectedKey = key
    const newcomers: SyncDeviceId[] = []
    for (const id of connected) {
      if (!prev.has(id)) {
        newcomers.push(id)
      }
    }
    if (newcomers.length === 0) {
      await refreshSyncLinkStatusFromBus()
      return
    }
    // EN: Brief delay so DataChannel is open before mesh_peers / mesh_signal.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150)
    })
    for (const newbie of newcomers) {
      // EN: Tell the new neighbor about our other live peers.
      await announceToNeighbor(newbie)
    }
    for (const existing of connected) {
      if (newcomers.includes(existing)) {
        continue
      }
      // EN: Tell pre-existing neighbors about the newcomer(s) so they can mesh too.
      await announceToNeighbor(existing)
    }
    await refreshSyncLinkStatusFromBus()
  }

  deps.commandBus.onCommand((command) => {
    if (command.type === "mesh_peers") {
      void handleMeshPeers(command)
      return
    }
    if (command.type === "mesh_signal") {
      void handleMeshSignal(command)
    }
  })

  deps.commandBus.subscribeStates(() => {
    void onConnectedSetChanged()
  })
  void onConnectedSetChanged()
}
