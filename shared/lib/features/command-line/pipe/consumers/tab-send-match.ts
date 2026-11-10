/** EN: Match `tab -send <deviceId> [--close]` as a pipe consumer. */

export const TAB_SEND_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "page.group",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type TabSendPipeMatch = {
  deviceId: string
  closeAfter: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: True when the pipe-right segment is `tab -send <deviceId> [--close]` (no URL args).
 * JA: パイプ右辺が `tab -send <deviceId> [--close]`（URL 引数なし）のとき真。
 */
export function parseTabSendPipeConsumer(segment: string): TabSendPipeMatch | null {
  const parts = segment.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length !== 3 && parts.length !== 4) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "tab") {
    return null
  }
  if (normalizeToken(parts[1]!) !== "-send") {
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

export function isTabSendPipeConsumer(segment: string): boolean {
  return parseTabSendPipeConsumer(segment) !== null
}
