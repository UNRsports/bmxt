import { loadOrCreateDeviceIdentity } from "../device/device-identity.ts"
import { loadLocalRoster } from "../adapters/local-roster-store.ts"
import type { CommandBusStabilizer } from "../stabilizers/command-bus.ts"
import type { DiscoveryStabilizer } from "../stabilizers/discovery.ts"
import type { PeerHostStabilizer } from "../stabilizers/peer-host.ts"
import {
  beginSyncLinkConnecting,
  endSyncLinkConnecting,
  setSyncLinkConnectedPeers,
  type SyncLinkPeer
} from "./sync-link-status.ts"

const CONNECT_WAIT_MS = 45_000
const CONNECT_POLL_MS = 200

let wired = false
let busRef: CommandBusStabilizer | null = null
let peerHostRef: PeerHostStabilizer | null = null
let discoveryRef: DiscoveryStabilizer | null = null

async function resolveDisplayName(deviceId: string): Promise<string> {
  const roster = await loadLocalRoster()
  const fromRoster = roster?.members.find((m) => m.deviceId === deviceId)
  if (fromRoster !== undefined) {
    return fromRoster.displayName
  }
  if (discoveryRef !== null) {
    const known = await discoveryRef.listKnown()
    const hit = known.find((d) => d.deviceId === deviceId)
    if (hit !== undefined) {
      return hit.displayName
    }
  }
  return deviceId
}

export async function refreshSyncLinkStatusFromBus(): Promise<void> {
  if (busRef === null) {
    return
  }
  const self = await loadOrCreateDeviceIdentity()
  const peers: SyncLinkPeer[] = []
  for (const row of busRef.listStates()) {
    if (row.deviceId === self.deviceId || row.deviceId === "pending-offer") {
      continue
    }
    if (row.state !== "connected") {
      continue
    }
    peers.push({
      deviceId: row.deviceId,
      displayName: await resolveDisplayName(row.deviceId)
    })
  }
  // EN: Also include bound remotes that report connected via peer host.
  if (peerHostRef !== null) {
    for (const remoteId of peerHostRef.listBoundRemoteDeviceIds()) {
      if (remoteId === self.deviceId || remoteId === "pending-offer") {
        continue
      }
      if (peers.some((p) => p.deviceId === remoteId)) {
        continue
      }
      const raw = peerHostRef.getConnectionState(remoteId)
      if (raw !== "connected") {
        continue
      }
      peers.push({
        deviceId: remoteId,
        displayName: await resolveDisplayName(remoteId)
      })
    }
  }
  setSyncLinkConnectedPeers(peers)
}

/**
 * EN: Subscribe bus state changes into the link status bar (idempotent).
 * JA: バス状態変化をリンクステータスへ橋渡し（冪等）。
 */
export function ensureSyncLinkBridge(args: {
  commandBus: CommandBusStabilizer
  peerHost: PeerHostStabilizer
  discovery: DiscoveryStabilizer
}): void {
  busRef = args.commandBus
  peerHostRef = args.peerHost
  discoveryRef = args.discovery
  if (wired) {
    return
  }
  wired = true
  args.commandBus.subscribeStates(() => {
    void refreshSyncLinkStatusFromBus()
  })
  void refreshSyncLinkStatusFromBus()
}

export function markSyncLinkConnecting(peerName: string | null): void {
  beginSyncLinkConnecting(peerName)
}

export function clearSyncLinkConnecting(): void {
  endSyncLinkConnecting()
}

/**
 * EN: Wait until the peer DataChannel maps to connected, or timeout.
 * JA: ピア DataChannel が connected になるかタイムアウトまで待つ。
 */
export async function waitForSyncLinkConnected(remoteDeviceId: string): Promise<boolean> {
  if (busRef === null || peerHostRef === null) {
    return false
  }
  const deadline = Date.now() + CONNECT_WAIT_MS
  while (Date.now() < deadline) {
    const mapped = await busRef.connect(remoteDeviceId)
    if (mapped === "connected") {
      await refreshSyncLinkStatusFromBus()
      return true
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, CONNECT_POLL_MS)
    })
  }
  await refreshSyncLinkStatusFromBus()
  return false
}
