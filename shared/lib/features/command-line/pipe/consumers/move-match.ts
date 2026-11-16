/** EN: `move --window …` / `--group …` / `--ungroup` as pipe consumer. */

export const MOVE_ACCEPTS_BMXT_RULE_KINDS = ["page.open"] as const

export type MovePipeFlags = {
  windowId: number
  groupId: number
  ungroup: boolean
}

export function parseMovePipeSegment(segment: string): MovePipeFlags | null {
  const parts = segment.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0 || parts[0]!.toLowerCase() !== "move") {
    return null
  }
  let windowId = -1
  let groupId = -1
  let ungroup = false
  let i = 1
  while (i < parts.length) {
    const token = parts[i]!
    if (token === "--window") {
      windowId = Number.parseInt(parts[i + 1] ?? "", 10)
      i += 2
      continue
    }
    if (token === "--group") {
      groupId = Number.parseInt(parts[i + 1] ?? "", 10)
      i += 2
      continue
    }
    if (token === "--ungroup") {
      ungroup = true
      i += 1
      continue
    }
    return null
  }
  if (!Number.isFinite(windowId) || windowId < 0) {
    return null
  }
  if (ungroup && groupId >= 0) {
    return null
  }
  return { windowId, groupId, ungroup }
}

export function isMovePipeConsumer(segment: string): boolean {
  return parseMovePipeSegment(segment) !== null
}
