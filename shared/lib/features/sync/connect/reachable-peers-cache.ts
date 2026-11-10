import type { ReachableSyncPeer } from "./reachable-sync-peer.ts"

const CACHE_TTL_MS = 3_000

let cache: { at: number; peers: ReachableSyncPeer[] } | null = null
let inFlight: Promise<ReachableSyncPeer[]> | null = null

export function readReachablePeersCache(force: boolean): ReachableSyncPeer[] | null {
  if (force || cache === null) {
    return null
  }
  if (Date.now() - cache.at >= CACHE_TTL_MS) {
    return null
  }
  return cache.peers
}

export function getReachablePeersInFlight(): Promise<ReachableSyncPeer[]> | null {
  return inFlight
}

export function setReachablePeersInFlight(
  promise: Promise<ReachableSyncPeer[]> | null
): void {
  inFlight = promise
}

export function writeReachablePeersCache(peers: ReachableSyncPeer[]): void {
  cache = { at: Date.now(), peers }
}

export function clearReachableSyncPeersCache(): void {
  cache = null
}
