/**
 * EN: Live sync link UI snapshot — connected peers + tunnel-establishing lock.
 * JA: 同期リンクの UI スナップショット（接続ピア＋トンネル開通中ロック）。
 */

export type SyncLinkPeer = {
  deviceId: string
  displayName: string
}

export type SyncLinkStatus = {
  /** EN: Prompt locked while ICE / DataChannel is coming up. */
  connecting: boolean
  connectingPeerName: string | null
  connectedPeers: SyncLinkPeer[]
}

const EMPTY: SyncLinkStatus = {
  connecting: false,
  connectingPeerName: null,
  connectedPeers: []
}

let status: SyncLinkStatus = { ...EMPTY, connectedPeers: [] }

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function peersEqual(a: SyncLinkPeer[], b: SyncLinkPeer[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]!.deviceId !== b[i]!.deviceId || a[i]!.displayName !== b[i]!.displayName) {
      return false
    }
  }
  return true
}

export function getSyncLinkStatus(): SyncLinkStatus {
  return status
}

export function subscribeSyncLinkStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setSyncLinkConnectedPeers(peers: SyncLinkPeer[]): void {
  const next = peers
    .filter((p) => p.deviceId.length > 0)
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
  const clearConnecting = status.connecting && next.length > 0
  if (peersEqual(next, status.connectedPeers) && !clearConnecting) {
    return
  }
  status = {
    connecting: clearConnecting ? false : status.connecting,
    connectingPeerName: clearConnecting ? null : status.connectingPeerName,
    connectedPeers: next
  }
  notify()
}

export function beginSyncLinkConnecting(peerName: string | null): void {
  status = {
    ...status,
    connecting: true,
    connectingPeerName: peerName
  }
  notify()
}

export function endSyncLinkConnecting(): void {
  if (!status.connecting) {
    return
  }
  status = {
    ...status,
    connecting: false,
    connectingPeerName: null
  }
  notify()
}

export function resetSyncLinkStatus(): void {
  status = { ...EMPTY, connectedPeers: [] }
  notify()
}
