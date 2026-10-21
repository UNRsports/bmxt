/** EN: Bare `browse` as a pipe consumer (right of `|`). */

export const BROWSE_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "page.window",
  "page.group",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit",
  "dom.node",
  "dom.notice",
  "session.row",
  "setting.field"
] as const

export function isBrowsePipeConsumer(segment: string): boolean {
  return segment.trim().toLowerCase() === "browse"
}
