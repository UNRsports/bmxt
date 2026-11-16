/** EN: Bare `open` / `open --window` as a pipe consumer (right of `|`). */

export const OPEN_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit"
] as const

export type OpenPipeFlags = {
  window: boolean
}

export function parseOpenPipeSegment(segment: string): OpenPipeFlags | null {
  const parts = segment.trim().split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "open") {
    return null
  }
  let window = false
  for (let i = 1; i < parts.length; i++) {
    const token = parts[i]!
    if (token === "--window") {
      window = true
      continue
    }
    return null
  }
  return { window }
}

export function isOpenPipeConsumer(segment: string): boolean {
  return parseOpenPipeSegment(segment) !== null
}
