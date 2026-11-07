import { getSyncService } from "../facade/sync-service.ts"
import type { ReachableSyncPeer } from "./reachable-sync-peer.ts"
import {
  clearReachableSyncPeersCache,
  getReachablePeersInFlight,
  readReachablePeersCache,
  setReachablePeersInFlight,
  writeReachablePeersCache
} from "./reachable-peers-cache.ts"

export type { ReachableSyncPeer } from "./reachable-sync-peer.ts"
export {
  filterReachableSyncPeers,
  labelReachableSyncPeer
} from "./reachable-sync-peer.ts"
export { clearReachableSyncPeersCache } from "./reachable-peers-cache.ts"

/**
 * EN: Peers with a live DataChannel that answer ping (excludes self).
 * JA: DataChannel 接続中かつ ping 応答があるピア（自分以外）。
 */
export async function scanReachableSyncPeers(options?: {
  force?: boolean
}): Promise<ReachableSyncPeer[]> {
  const force = options?.force === true
  const cached = readReachablePeersCache(force)
  if (cached !== null) {
    return cached
  }
  const existing = getReachablePeersInFlight()
  if (!force && existing !== null) {
    return existing
  }
  const promise = (async () => {
    const peers = await getSyncService().listReachablePeers()
    writeReachablePeersCache(peers)
    return peers
  })()
  setReachablePeersInFlight(promise)
  try {
    return await promise
  } finally {
    setReachablePeersInFlight(null)
  }
}
