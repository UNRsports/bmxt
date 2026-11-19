/** EN: Bare `browse` as a pipe consumer (right of `|`) — judgment via WASM. */

import { classifyPipeConsumer } from "./classify.ts"

export const BROWSE_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "page.window",
  "page.group",
  "bookmark",
  "bookmark.folder",
  "history",
  "markdown.file",
  "search.hit",
  "dom.node",
  "dom.notice",
  "session.row",
  "setting.field"
] as const

export function isBrowsePipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "browse"
}
