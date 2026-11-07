export type ReachableSyncPeer = {
  deviceId: string
  displayName: string
  rttMs: number | null
}

export function filterReachableSyncPeers(
  peers: readonly ReachableSyncPeer[],
  prefix: string,
  matchMode: "prefix" | "contains"
): ReachableSyncPeer[] {
  const p = prefix.trim().toLowerCase()
  if (p.length === 0) {
    return [...peers]
  }
  return peers.filter((peer) => {
    const id = peer.deviceId.toLowerCase()
    const name = peer.displayName.toLowerCase()
    if (matchMode === "contains") {
      return id.includes(p) || name.includes(p)
    }
    return id.startsWith(p) || name.startsWith(p)
  })
}

export function labelReachableSyncPeer(peer: ReachableSyncPeer): string {
  const rtt =
    typeof peer.rttMs === "number" && Number.isFinite(peer.rttMs)
      ? ` · ${Math.round(peer.rttMs)}ms`
      : ""
  return `${peer.displayName} (${peer.deviceId})${rtt}`
}
