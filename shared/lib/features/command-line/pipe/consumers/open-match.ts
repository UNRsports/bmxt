/** EN: `open` / `open --window` / `open --into-window` / `open --into-group` as pipe consumers. */

export const OPEN_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type OpenPipeFlags =
  | { mode: "new_tab" }
  | { mode: "new_window" }
  | { mode: "into_window"; windowId: number }
  | { mode: "into_group"; windowId: number; groupId: number }

export function parseOpenPipeSegment(segment: string): OpenPipeFlags | null {
  const parts = segment.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "open") {
    return null
  }
  let mode: OpenPipeFlags = { mode: "new_tab" }
  let i = 1
  while (i < parts.length) {
    const token = parts[i]!
    if (token === "--window") {
      mode = { mode: "new_window" }
      i += 1
      continue
    }
    if (token === "--into-window") {
      const id = Number.parseInt(parts[i + 1] ?? "", 10)
      if (!Number.isFinite(id) || id < 0) {
        return null
      }
      mode = { mode: "into_window", windowId: id }
      i += 2
      continue
    }
    if (token === "--into-group") {
      const groupId = Number.parseInt(parts[i + 1] ?? "", 10)
      if (!Number.isFinite(groupId) || groupId < 0) {
        return null
      }
      i += 2
      let windowId = -1
      if (parts[i] === "--window-id") {
        windowId = Number.parseInt(parts[i + 1] ?? "", 10)
        i += 2
      }
      if (!Number.isFinite(windowId) || windowId < 0) {
        return null
      }
      mode = { mode: "into_group", windowId, groupId }
      continue
    }
    if (token === "--window-id") {
      // EN: Allow `--window-id` before `--into-group`.
      const windowId = Number.parseInt(parts[i + 1] ?? "", 10)
      i += 2
      if (mode.mode === "into_group") {
        mode = { mode: "into_group", windowId, groupId: mode.groupId }
      }
      continue
    }
    return null
  }
  return mode
}

export function isOpenPipeConsumer(segment: string): boolean {
  return parseOpenPipeSegment(segment) !== null
}
