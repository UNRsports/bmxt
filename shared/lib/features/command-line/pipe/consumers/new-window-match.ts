/** EN: Bare `new-window` as a pipe consumer — judgment via WASM. */

import { classifyPipeConsumer } from "./classify.ts"

export const NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS = ["page.open"] as const

export function isNewWindowPipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "new-window"
}
