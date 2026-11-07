/** EN: Match `sync -open <deviceId>` as a pipe consumer. */

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
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: True when the pipe-right segment is `sync -open <deviceId>` (no extra URL args).
 * JA: パイプ右辺が `sync -open <deviceId>`（URL 引数なし）のとき真。
 */
export function parseSyncOpenPipeConsumer(segment: string): SyncOpenPipeMatch | null {
  const parts = segment.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 3) {
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
  return { deviceId }
}

export function isSyncOpenPipeConsumer(segment: string): boolean {
  return parseSyncOpenPipeConsumer(segment) !== null
}
