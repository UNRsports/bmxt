import {
  loadOrCreateDeviceIdentity,
  setDeviceDisplayName
} from "../device/device-identity.ts"
import {
  buildInviteForLocalDevice,
  createFamilyMembership,
  joinFamilyFromInvite,
  loadFamilyMembership
} from "../device/family-membership"
import { connectRoleForPeer, type SyncConnectRole } from "../bus/connect-role.ts"
import { clearReachableSyncPeersCache } from "../connect/reachable-peers-cache.ts"
import {
  clearSyncConnectPending,
  getSyncConnectPending,
  setSyncConnectPending
} from "../connect/sync-connect-pending.ts"
import {
  formatRtcHandshakeCode,
  parseRtcHandshakeCode,
  RTC_HANDSHAKE_TTL_MS_CONNECT,
  type RtcHandshakePlain
} from "../discovery/rtc-handshake-codec"
import { createDefaultSyncStabilizers } from "./default-stabilizers"
import type { SyncStabilizers } from "../stabilizers"
import type {
  SyncDiscoveryRecord,
  SyncRemoteSearchHit,
  SyncRemoteTabRow,
  SyncRosterMember,
  SyncStatusSnapshot,
  SyncTabsOp,
  TabsChangedReason,
  TabsChangedSignal
} from "../types"
import type { FamilySignalFirstCommand } from "../bus/family-signal-first.ts"
import { sanitizeGroupTitle, sanitizeRemoteOpenUrls } from "../bus/remote-open-sanitize.ts"
import { ensurePeerDocument } from "../peer/ensure-peer-document"
import { installAutoMesh } from "../mesh/auto-mesh.ts"
import { loadLocalRoster, upsertLocalRosterMember } from "../adapters/local-roster-store"
import {
  clearSyncLinkConnecting,
  ensureSyncLinkBridge,
  markSyncLinkConnecting,
  refreshSyncLinkStatusFromBus,
  waitForSyncLinkConnected
} from "../link/sync-link-bridge.ts"

export type SyncConnectSession = {
  kind: "handshake"
  peerDeviceId: string
  peerDisplayName: string
  role: SyncConnectRole
  outboundCode: string | null
  awaitingInbound: boolean
}

export type SyncConnectResult = {
  ok: boolean
  lines: string[]
  alreadyConnected?: boolean
  session?: SyncConnectSession
}

export type SyncService = {
  status(): Promise<SyncStatusSnapshot>
  pair(rawInvite: string): Promise<{ ok: boolean; lines: string[] }>
  members(): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Create offer code for the other browser to paste. */
  offer(): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Accept offer code; return answer code to paste back. */
  answer(offerCode: string): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Accept answer code on the offerer side; DataChannel should connect. */
  accept(answerCode: string): Promise<{ ok: boolean; lines: string[] }>
  /** EN: Reconnect to a roster member without -setup wizard. */
  connect(deviceId: string): Promise<SyncConnectResult>
  openRemote(
    deviceId: string,
    urls: string[],
    groupTitle: string | null,
    windowId?: number | null
  ): Promise<{ ok: boolean; lines: string[]; openedUrls: string[] }>
  listRemoteTabs(
    deviceId: string,
    showUrl: boolean
  ): Promise<{ ok: boolean; detail: string | null; rows: SyncRemoteTabRow[] }>
  searchRemote(
    deviceId: string,
    dispatchLine: string
  ): Promise<{ ok: boolean; detail: string | null; hits: SyncRemoteSearchHit[] }>
  tabsOps(
    deviceId: string,
    op: SyncTabsOp
  ): Promise<{ ok: boolean; detail: string | null }>
  ping(deviceId: string): Promise<{ ok: boolean; lines: string[] }>
  /**
   * EN: Roster/discovery peers that currently have a DataChannel and answer ping.
   * JA: いま DataChannel 接続中で ping 応答がある名簿／発見ピア。
   */
  listReachablePeers(): Promise<
    Array<{ deviceId: string; displayName: string; rttMs: number | null }>
  >
  /** EN: Re-sync bus states from bound RTC sessions; return connected peer ids. */
  listConnectedPeerDeviceIds(): Promise<string[]>
  /**
   * EN: Broadcast tabs_changed to connected Family peers (and self subscribers).
   * JA: 接続中 Family へ tabs_changed を广播（自端末の購読者も含む）。
   * @param first First-command selection code (default `"tab"`).
   */
  announceTabsChanged(
    reason: TabsChangedReason,
    first?: FamilySignalFirstCommand
  ): Promise<void>
  /** EN: Subscribe to Family / local tabs_changed signals for open picker refresh. */
  subscribeTabsChanged(listener: (signal: TabsChangedSignal) => void): () => void
  setDisplayName(name: string): Promise<{ ok: boolean; lines: string[] }>
}

function line(text: string): string {
  return text
}

export function createSyncService(stabilizers: SyncStabilizers = createDefaultSyncStabilizers()): SyncService {
  const s = stabilizers
  ensureSyncLinkBridge({
    commandBus: s.commandBus,
    peerHost: s.peerHost,
    discovery: s.discovery
  })
  installAutoMesh({
    peerHost: s.peerHost,
    commandBus: s.commandBus,
    discovery: s.discovery
  })

  async function ensureFamily(): Promise<void> {
    const existing = await loadFamilyMembership()
    if (existing === null) {
      await createFamilyMembership()
    }
  }

  async function requireFamily() {
    await ensureFamily()
    const membership = await loadFamilyMembership()
    const device = await loadOrCreateDeviceIdentity()
    if (membership === null) {
      return null
    }
    return { membership, device }
  }

  async function refreshConnectionStates(selfDeviceId: string): Promise<void> {
    await ensurePeerDocument()
    await s.peerHost.ensureReady()
    s.commandBus.discardState("pending-offer")
    const ids = new Set<string>([
      ...s.peerHost.listBoundRemoteDeviceIds(),
      ...s.commandBus.listStates().map((row) => row.deviceId)
    ])
    ids.delete(selfDeviceId)
    ids.delete("pending-offer")
    await Promise.all([...ids].map((remoteId) => s.commandBus.connect(remoteId)))
  }

  return {
    async status() {
      await ensureFamily()
      const device = await loadOrCreateDeviceIdentity()
      const family = await loadFamilyMembership()
      let members: SyncRosterMember[] = []
      const roster = await loadLocalRoster()
      if (roster) {
        members = roster.members
      }
      const inviteDoc = await buildInviteForLocalDevice()
      const invite = inviteDoc ? s.discovery.formatInvite(inviteDoc) : null
      await s.commandBus.drainQueue()
      await refreshConnectionStates(device.deviceId)
      return {
        device,
        family,
        members,
        connections: s.commandBus.listStates(),
        invite
      }
    },

    async pair(rawInvite: string) {
      await ensureFamily()
      const trimmed = rawInvite.trim()
      if (trimmed.length === 0) {
        const invite = await buildInviteForLocalDevice()
        if (invite === null) {
          return { ok: false, lines: [line("sync.pair.noFamily")] }
        }
        const token = s.discovery.formatInvite(invite)
        setSyncConnectPending({
          kind: "invite",
          peerDeviceId: "*",
          peerDisplayName: "Family",
          role: null,
          outboundCode: token,
          awaitingInbound: false
        })
        return {
          ok: true,
          lines: [line("sync.pair.created"), line("sync.pair.useCopy")]
        }
      }
      const parsed = s.discovery.parseInvite(trimmed)
      if (parsed === null) {
        return { ok: false, lines: [line("sync.pair.invalidInvite")] }
      }
      if ((await joinFamilyFromInvite(parsed)) === null) {
        return { ok: false, lines: [line("sync.pair.joinFailed")] }
      }
      const peer: SyncDiscoveryRecord = {
        deviceId: parsed.fromDeviceId,
        displayName: parsed.fromDisplayName,
        familyId: parsed.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      }
      await s.discovery.rememberManual(peer)
      await upsertLocalRosterMember({
        deviceId: parsed.fromDeviceId,
        displayName: parsed.fromDisplayName,
        browser: "unknown",
        familyId: parsed.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
      return {
        ok: true,
        lines: [
          line(`sync.pair.joined:${parsed.familyId}`),
          line(`sync.pair.peer:${parsed.fromDisplayName}`)
        ]
      }
    },

    async members() {
      await ensureFamily()
      const roster = await loadLocalRoster()
      const known = await s.discovery.listKnown()
      const lines = [line("sync.members.header")]
      if (roster) {
        for (const m of roster.members) {
          lines.push(
            line(`sync.members.row:${m.displayName}|${m.deviceId}|${m.browser}|${m.updatedAt}`)
          )
        }
      }
      for (const d of known) {
        if (roster?.members.some((m) => m.deviceId === d.deviceId)) {
          continue
        }
        lines.push(line(`sync.members.discovered:${d.displayName}|${d.deviceId}|${d.source}`))
      }
      if (lines.length === 1) {
        lines.push(line("sync.members.empty"))
      }
      return { ok: true, lines }
    },

    async offer() {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const bundle = await s.peerHost.createOfferHandshake()
      const plain: RtcHandshakePlain = {
        v: 1,
        role: "offer",
        sessionId: bundle.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        plain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      setSyncConnectPending({
        kind: "handshake",
        peerDeviceId: "*",
        peerDisplayName: "peer",
        role: "offer",
        outboundCode: code,
        awaitingInbound: true
      })
      return {
        ok: true,
        lines: [line("sync.rtc.offerCreated"), line("sync.connect.copyThenWaitAnswer")]
      }
    },

    async answer(offerCode: string) {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const plain = await parseRtcHandshakeCode(offerCode, ctx.membership.seedB64)
      if (plain === null || plain.role !== "offer") {
        return { ok: false, lines: [line("sync.rtc.invalidCode")] }
      }
      if (plain.familyId !== ctx.membership.familyId) {
        return { ok: false, lines: [line("sync.rtc.familyMismatch")] }
      }
      if (
        typeof plain.toDeviceId === "string" &&
        plain.toDeviceId !== "*" &&
        plain.toDeviceId !== ctx.device.deviceId
      ) {
        return { ok: false, lines: [line("sync.rtc.wrongAddressee")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      let accepted: { sessionId: string; sdp: string; ice: string[]; remoteDeviceId: string }
      try {
        accepted = await s.peerHost.acceptOfferHandshake(plain)
      } catch {
        return { ok: false, lines: [line("sync.rtc.acceptFailed")] }
      }
      s.commandBus.discardState("pending-offer")
      await s.commandBus.connect(accepted.remoteDeviceId)
      await s.discovery.rememberManual({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        familyId: plain.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      })
      await upsertLocalRosterMember({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        browser: "unknown",
        familyId: plain.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
      const answerPlain: RtcHandshakePlain = {
        v: 1,
        role: "answer",
        sessionId: accepted.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        toDeviceId: plain.fromDeviceId,
        sdp: accepted.sdp,
        ice: accepted.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        toDeviceId: plain.fromDeviceId,
        ttlMs: RTC_HANDSHAKE_TTL_MS_CONNECT,
        plain: answerPlain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      const prior = getSyncConnectPending()
      setSyncConnectPending({
        kind: "handshake",
        peerDeviceId: plain.fromDeviceId,
        peerDisplayName:
          prior?.peerDisplayName && prior.peerDeviceId === plain.fromDeviceId
            ? prior.peerDisplayName
            : plain.fromDisplayName,
        role: "answer",
        outboundCode: code,
        awaitingInbound: false
      })
      // EN: Answer side waits for the offerer to apply the answer — tunnel comes up next.
      markSyncLinkConnecting(plain.fromDisplayName)
      void waitForSyncLinkConnected(plain.fromDeviceId).then((ok) => {
        if (!ok) {
          clearSyncLinkConnecting()
        }
      })
      return {
        ok: true,
        lines: [
          line("sync.rtc.answerCreated"),
          line(`sync.rtc.peer:${plain.fromDisplayName}`),
          line("sync.connect.copyThenWaitPeerAccept")
        ]
      }
    },

    async accept(answerCode: string) {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const plain = await parseRtcHandshakeCode(answerCode, ctx.membership.seedB64)
      if (plain === null || plain.role !== "answer") {
        return { ok: false, lines: [line("sync.rtc.invalidCode")] }
      }
      if (plain.familyId !== ctx.membership.familyId) {
        return { ok: false, lines: [line("sync.rtc.familyMismatch")] }
      }
      if (
        typeof plain.toDeviceId === "string" &&
        plain.toDeviceId !== "*" &&
        plain.toDeviceId !== ctx.device.deviceId
      ) {
        return { ok: false, lines: [line("sync.rtc.wrongAddressee")] }
      }
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      markSyncLinkConnecting(plain.fromDisplayName)
      let remoteDeviceId: string
      try {
        remoteDeviceId = await s.peerHost.applyAnswerHandshake(plain)
      } catch {
        clearSyncLinkConnecting()
        return { ok: false, lines: [line("sync.rtc.acceptFailed")] }
      }
      s.commandBus.discardState("pending-offer")
      await s.commandBus.connect(remoteDeviceId)
      await s.discovery.rememberManual({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        familyId: plain.familyId,
        endpointHint: null,
        discoveredAt: new Date().toISOString(),
        source: "manual"
      })
      await upsertLocalRosterMember({
        deviceId: plain.fromDeviceId,
        displayName: plain.fromDisplayName,
        browser: "unknown",
        familyId: plain.familyId,
        updatedAt: new Date().toISOString(),
        endpointHint: null
      })
      const linked = await waitForSyncLinkConnected(remoteDeviceId)
      if (!linked) {
        clearSyncLinkConnecting()
        return { ok: false, lines: [line("sync.rtc.acceptFailed")] }
      }
      // EN: Handshake success is enough to finish setup. Ping may fail briefly
      // right after the DataChannel opens; treat it as diagnostics only.
      const ping = await s.commandBus.ping(remoteDeviceId)
      const lines = [
        line(`sync.rtc.connected:${plain.fromDisplayName}`),
        line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
      ]
      if (!ping.ok) {
        lines.push(line("sync.rtc.pingDeferred"))
      }
      clearSyncConnectPending()
      clearReachableSyncPeersCache()
      await refreshSyncLinkStatusFromBus()
      return { ok: true, lines }
    },

    async connect(deviceId: string): Promise<SyncConnectResult> {
      const ctx = await requireFamily()
      if (ctx === null) {
        return { ok: false, lines: [line("sync.pair.noFamily")] }
      }
      const trimmed = deviceId.trim()
      if (trimmed.length === 0 || trimmed === ctx.device.deviceId) {
        return { ok: false, lines: [line("sync.connect.badDeviceId")] }
      }
      const roster = await loadLocalRoster()
      const member = roster?.members.find((m) => m.deviceId === trimmed) ?? null
      const discovered = (await s.discovery.listKnown()).find((d) => d.deviceId === trimmed)
      if (member === null && discovered === undefined) {
        return { ok: false, lines: [line("sync.connect.unknownMember")] }
      }
      const peerDisplayName =
        member?.displayName ?? discovered?.displayName ?? trimmed

      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(trimmed)
      if (state === "connected") {
        clearSyncConnectPending()
        await refreshSyncLinkStatusFromBus()
        const ping = await s.commandBus.ping(trimmed)
        return {
          ok: ping.ok,
          alreadyConnected: true,
          lines: [
            line(`sync.rtc.connected:${peerDisplayName}`),
            line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
          ]
        }
      }

      // EN: Explicit reconnect — drop only this peer's prior (failed/zombie) session.
      // JA: 明示的再接続。この peer の旧（失敗／ゾンビ）セッションだけ落とす。
      await s.peerHost.closeSession(trimmed)

      const role = connectRoleForPeer(ctx.device.deviceId, trimmed)
      if (role === "answer") {
        const session: SyncConnectSession = {
          kind: "handshake",
          peerDeviceId: trimmed,
          peerDisplayName,
          role: "answer",
          outboundCode: null,
          awaitingInbound: true
        }
        setSyncConnectPending(session)
        return {
          ok: true,
          session,
          lines: [
            line(`sync.connect.role:answer`),
            line(`sync.connect.peer:${peerDisplayName}|${trimmed}`),
            line("sync.connect.waitOffer")
          ]
        }
      }

      const bundle = await s.peerHost.createOfferHandshake()
      const plain: RtcHandshakePlain = {
        v: 1,
        role: "offer",
        sessionId: bundle.sessionId,
        fromDeviceId: ctx.device.deviceId,
        fromDisplayName: ctx.device.displayName,
        familyId: ctx.membership.familyId,
        toDeviceId: trimmed,
        sdp: bundle.sdp,
        ice: bundle.ice
      }
      const code = await formatRtcHandshakeCode({
        familyId: ctx.membership.familyId,
        seedB64: ctx.membership.seedB64,
        fromDeviceId: ctx.device.deviceId,
        toDeviceId: trimmed,
        ttlMs: RTC_HANDSHAKE_TTL_MS_CONNECT,
        plain
      })
      if (code === null) {
        return { ok: false, lines: [line("sync.rtc.encodeFailed")] }
      }
      const session: SyncConnectSession = {
        kind: "handshake",
        peerDeviceId: trimmed,
        peerDisplayName,
        role: "offer",
        outboundCode: code,
        awaitingInbound: true
      }
      setSyncConnectPending(session)
      return {
        ok: true,
        session,
        lines: [
          line(`sync.connect.role:offer`),
          line(`sync.connect.peer:${peerDisplayName}|${trimmed}`),
          line("sync.rtc.offerCreated"),
          line("sync.connect.copyThenWaitAnswer")
        ]
      }
    },

    async openRemote(
      deviceId: string,
      urls: string[],
      groupTitle: string | null,
      windowId: number | null = null
    ) {
      const safeUrls = sanitizeRemoteOpenUrls(urls)
      if (safeUrls.length === 0) {
        return { ok: false, lines: [line("sync.open.noUrls")], openedUrls: [] }
      }
      const title = sanitizeGroupTitle(groupTitle)
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return {
          ok: false,
          lines: [line("sync.open.notConnected"), line(`sync.connect.state:${state}`)],
          openedUrls: []
        }
      }
      const result = await s.commandBus.openTabs(deviceId, safeUrls, title, windowId)
      return {
        ok: result.ok,
        lines: [line(`sync.open.done:ok=${result.ok};detail=${result.detail ?? ""}`)],
        openedUrls: result.openedUrls
      }
    },

    async listRemoteTabs(deviceId: string, showUrl: boolean) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return { ok: false, detail: `not_connected:${state}`, rows: [] }
      }
      return s.commandBus.listTabs(deviceId, showUrl)
    },

    async searchRemote(deviceId: string, dispatchLine: string) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return { ok: false, detail: `not_connected:${state}`, hits: [] }
      }
      return s.commandBus.searchQuery(deviceId, dispatchLine)
    },

    async tabsOps(deviceId: string, op: SyncTabsOp) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      if (state !== "connected") {
        return { ok: false, detail: `not_connected:${state}` }
      }
      return s.commandBus.tabsOps(deviceId, op)
    },

    async ping(deviceId: string) {
      await ensurePeerDocument()
      await s.peerHost.ensureReady()
      const state = await s.commandBus.connect(deviceId)
      const ping = await s.commandBus.ping(deviceId)
      if (ping.ok) {
        clearReachableSyncPeersCache()
      }
      return {
        ok: ping.ok,
        lines: [
          line(`sync.connect.state:${state}`),
          line(`sync.connect.ping:ok=${ping.ok};rtt=${ping.rttMs ?? "n/a"}`)
        ]
      }
    },

    async listConnectedPeerDeviceIds() {
      const device = await loadOrCreateDeviceIdentity()
      await refreshConnectionStates(device.deviceId)
      return s.commandBus
        .listStates()
        .filter(
          (row) =>
            row.state === "connected" &&
            row.deviceId !== device.deviceId &&
            row.deviceId !== "pending-offer"
        )
        .map((row) => row.deviceId)
    },

    async listReachablePeers() {
      const family = await loadFamilyMembership()
      if (family === null) {
        return []
      }
      const device = await loadOrCreateDeviceIdentity()
      await refreshConnectionStates(device.deviceId)
      const byId = new Map<string, string>()
      const roster = await loadLocalRoster()
      if (roster !== null) {
        for (const member of roster.members) {
          if (member.deviceId !== device.deviceId) {
            byId.set(member.deviceId, member.displayName)
          }
        }
      }
      for (const discovered of await s.discovery.listKnown()) {
        if (discovered.deviceId === device.deviceId) {
          continue
        }
        if (!byId.has(discovered.deviceId)) {
          byId.set(discovered.deviceId, discovered.displayName)
        }
      }
      for (const remoteId of s.peerHost.listBoundRemoteDeviceIds()) {
        if (remoteId === device.deviceId) {
          continue
        }
        if (!byId.has(remoteId)) {
          byId.set(remoteId, remoteId)
        }
      }

      const reachable: Array<{
        deviceId: string
        displayName: string
        rttMs: number | null
      }> = []
      for (const [deviceId, displayName] of byId) {
        const state = await s.commandBus.connect(deviceId)
        if (state !== "connected") {
          continue
        }
        const ping = await s.commandBus.ping(deviceId)
        if (!ping.ok) {
          continue
        }
        reachable.push({
          deviceId,
          displayName,
          rttMs: ping.rttMs
        })
      }
      return reachable
    },

    async announceTabsChanged(reason: TabsChangedReason, first?: FamilySignalFirstCommand) {
      await s.commandBus.announceTabsChanged(reason, first)
    },

    subscribeTabsChanged(listener) {
      return s.commandBus.subscribeTabsChanged(listener)
    },

    async setDisplayName(name: string) {
      const next = await setDeviceDisplayName(name)
      if (next === null) {
        return { ok: false, lines: [line("sync.name.invalid")] }
      }
      return { ok: true, lines: [line(`sync.name.ok:${next.displayName}`)] }
    }
  }
}

/** EN: Survive duplicate module graphs / HMR so status and --peers share one bus. */
const SYNC_SERVICE_HOLDER_KEY = "__bmxt_sync_service_holder__" as const

type SyncServiceHolder = { current: SyncService | null }

function syncServiceHolder(): SyncServiceHolder {
  const globalRef = globalThis as typeof globalThis & {
    [SYNC_SERVICE_HOLDER_KEY]?: SyncServiceHolder
  }
  const existing = globalRef[SYNC_SERVICE_HOLDER_KEY]
  if (existing !== undefined) {
    return existing
  }
  const created: SyncServiceHolder = { current: null }
  globalRef[SYNC_SERVICE_HOLDER_KEY] = created
  return created
}

export function getSyncService(): SyncService {
  const holder = syncServiceHolder()
  if (holder.current === null) {
    holder.current = createSyncService()
  }
  return holder.current
}

/** EN: Test hook — replace singleton wiring. */
export function setSyncServiceForTests(service: SyncService | null): void {
  syncServiceHolder().current = service
}
