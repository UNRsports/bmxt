/** EN: Bare `jump` as a pipe consumer (right of `|`). */

export const JUMP_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "search.hit",
  "dom.node"
] as const

export function isJumpPipeConsumer(segment: string): boolean {
  return segment.trim().toLowerCase() === "jump"
}
