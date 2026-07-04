/** EN: Parse standalone / pipe-consumer `picker` segments. */

export type PickerConsumerOptions = {
  showUrl: boolean
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase()
}

/**
 * EN: True when the segment is exactly `picker` or `picker -u` (pipe consumer / bare command).
 * JA: セグメントが `picker` または `picker -u` のとき真。
 */
export function isPickerCommandSegment(segment: string): boolean {
  return parsePickerConsumerSegment(segment) !== null
}

/**
 * EN: Parse `picker` / `picker -u`. Other tokens → null.
 * JA: `picker` / `picker -u` のみ。それ以外は null。
 */
export function parsePickerConsumerSegment(segment: string): PickerConsumerOptions | null {
  const parts = segment.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length === 0) {
    return null
  }
  if (normalizeToken(parts[0]!) !== "picker") {
    return null
  }

  let showUrl = false
  for (let index = 1; index < parts.length; index += 1) {
    const token = normalizeToken(parts[index]!)
    if (token === "-u") {
      showUrl = true
      continue
    }
    return null
  }

  return { showUrl }
}
