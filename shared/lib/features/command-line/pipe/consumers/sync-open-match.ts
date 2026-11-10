/** EN: Match `sync -open <deviceId> [--close]` as a pipe consumer. */

export const SYNC_OPEN_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "page.group",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type SyncOpenPipeMatch = {
  deviceId: string
  closeAfter: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: True when the pipe-right segment is `sync -open <deviceId> [--close]` (no URL args).
 * JA: パイプ右辺が `sync -open <deviceId> [--close]`（URL 引数なし）のとき真。
 */
export function parseSyncOpenPipeConsumer(segment: string): SyncOpenPipeMatch | null {
  const parts = segment.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 3 && parts.length !== 4) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "sync") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-open") {
    return null
  }
  const deviceId = parts[2]!.trim()
  if (deviceId.length === 0 || deviceId.startsWith("-")) {
    return null
  }
  let closeAfter = false
  if (parts.length === 4) {
    if (parts[3] !== "--close") {
      return null
    }
    closeAfter = true
  }
  return { deviceId, closeAfter }
}

export function isSyncOpenPipeConsumer(segment: string): boolean {
  return parseSyncOpenPipeConsumer(segment) !== null
}
