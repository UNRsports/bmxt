/** EN: Match `tab -send <deviceId> [--close]` as a pipe consumer — judgment via WASM. */

import { classifyPipeConsumer } from "./classify.ts"

export const TAB_SEND_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "page.group",
  "bookmark",
  "bookmark.folder",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type TabSendPipeMatch = {
  deviceId: string
  closeAfter: boolean
}

/**
 * EN: True when the pipe-right segment is `tab -send <deviceId> [--close]` (no URL args).
 * JA: パイプ右辺が `tab -send <deviceId> [--close]`（URL 引数なし）のとき真。
 */
export function parseTabSendPipeConsumer(segment: string): TabSendPipeMatch | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "tab-send") {
    return null
  }
  return { deviceId: classified.deviceId, closeAfter: classified.closeAfter }
}

export function isTabSendPipeConsumer(segment: string): boolean {
  return parseTabSendPipeConsumer(segment) !== null
}
