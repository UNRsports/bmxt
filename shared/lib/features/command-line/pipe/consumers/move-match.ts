/** EN: `move --window …` / `--group …` / `--ungroup` as pipe consumer — judgment via WASM. */

import { classifyPipeConsumer } from "./classify.ts"

export const MOVE_ACCEPTS_BMXT_RULE_KINDS = ["page.open"] as const

export type MovePipeFlags = {
  windowId: number
  groupId: number
  ungroup: boolean
}

export function parseMovePipeSegment(segment: string): MovePipeFlags | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "move") {
    return null
  }
  return {
    windowId: classified.windowId,
    groupId: classified.groupId,
    ungroup: classified.ungroup
  }
}

export function isMovePipeConsumer(segment: string): boolean {
  return parseMovePipeSegment(segment) !== null
}
