/** EN: `open` / destination flags as pipe consumers — judgment via WASM. */

import { classifyPipeConsumer, type OpenPipeMode } from "./classify.ts"

export const OPEN_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "bookmark",
  "bookmark.folder",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type OpenPipeFlags =
  | { mode: "new_tab" }
  | { mode: "new_window" }
  | { mode: "into_window"; windowId: number }
  | { mode: "into_group"; windowId: number; groupId: number }

function flagsFromMode(
  mode: OpenPipeMode,
  windowId: number | undefined,
  groupId: number | undefined
): OpenPipeFlags | null {
  switch (mode) {
    case "new_tab":
      return { mode: "new_tab" }
    case "new_window":
      return { mode: "new_window" }
    case "into_window": {
      if (typeof windowId !== "number") {
        return null
      }
      return { mode: "into_window", windowId }
    }
    case "into_group": {
      if (typeof windowId !== "number" || typeof groupId !== "number") {
        return null
      }
      return { mode: "into_group", windowId, groupId }
    }
    default:
      return null
  }
}

export function parseOpenPipeSegment(segment: string): OpenPipeFlags | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "open") {
    return null
  }
  return flagsFromMode(classified.mode, classified.windowId, classified.groupId)
}

export function isOpenPipeConsumer(segment: string): boolean {
  return parseOpenPipeSegment(segment) !== null
}
