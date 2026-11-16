/** EN: Bare `new-window` as a pipe consumer. */

export const NEW_WINDOW_ACCEPTS_BMXT_RULE_KINDS = ["page.open"] as const

export function isNewWindowPipeConsumer(segment: string): boolean {
  return segment.trim().toLowerCase() === "new-window"
}
