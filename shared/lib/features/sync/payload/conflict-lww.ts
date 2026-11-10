import type { SyncLwwMeta } from "../types"

/**
 * EN: Simple last-write-wins: newer `updatedAt` wins; tie → lexicographic `deviceId`.
 * JA: 簡易 LWW。新しい updatedAt 優先、同時刻は deviceId 辞書順。
 */
export function compareLww(a: SyncLwwMeta, b: SyncLwwMeta): number {
  const ta = Date.parse(a.updatedAt)
  const tb = Date.parse(b.updatedAt)
  const aOk = Number.isFinite(ta)
  const bOk = Number.isFinite(tb)
  if (aOk && bOk && ta !== tb) {
    return ta < tb ? -1 : 1
  }
  if (aOk && !bOk) {
    return 1
  }
  if (!aOk && bOk) {
    return -1
  }
  if (a.deviceId < b.deviceId) {
    return -1
  }
  if (a.deviceId > b.deviceId) {
    return 1
  }
  return 0
}

/** EN: True when `incoming` should replace `current`. */
export function shouldAcceptLww(current: SyncLwwMeta | null, incoming: SyncLwwMeta): boolean {
  if (current === null) {
    return true
  }
  return compareLww(current, incoming) < 0
}
