/** EN: Bare `jump` as a pipe consumer — judgment via WASM. */

import { classifyPipeConsumer } from "./classify.ts"

export const JUMP_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "search.hit",
  "dom.node"
] as const

export function isJumpPipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "jump"
}
