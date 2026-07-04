/** EN: Parse prefix-form `picker` / `picker <list-command>`. */

export type PickerPrefixParse =
  | { kind: "usage" }
  | { kind: "run"; producerSegment: string }

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: Parse `picker` (usage) or `picker <list-command>` (open picker for that list).
 * JA: `picker`（usage）または `picker <list-command>`（その列挙をピッカー表示）。
 */
export function parsePickerPrefixLine(segment: string): PickerPrefixParse | null {
  const parts = segment.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length === 0) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "picker") {
    return null
  }
  if (parts.length === 1) {
    return { kind: "usage" }
  }
  return {
    kind: "run",
    producerSegment: parts.slice(1).join(" ")
  }
}

/** EN: True when the segment is a `picker` prefix command (bare or with producer). */
export function isPickerPrefixCommand(segment: string): boolean {
  return parsePickerPrefixLine(segment) !== null
}
