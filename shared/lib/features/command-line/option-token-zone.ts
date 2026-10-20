/** Cursor is in the first option token immediately after a `leadPattern` match (e.g. `tab `, `split `). */

import { resolveActiveCommandSegment } from "./compound/active-segment.ts"

export type OptionTokenZone = {
  optionStart: number
  prefix: string
  optionEnd: number
}

export function optionTokenZoneAfterLead(
  line: string,
  cursor: number,
  leadPattern: RegExp
): OptionTokenZone | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const localCursor = active.localCursor

  const m = leadPattern.exec(segmentLine)
  if (!m) {
    return null
  }
  const optionStartLocal = m.index + m[0].length
  if (localCursor < optionStartLocal) {
    return null
  }
  const optionEndLocal =
    optionStartLocal + (segmentLine.slice(optionStartLocal).match(/^[^\s]*/)?.[0].length ?? 0)
  if (localCursor > optionEndLocal) {
    return null
  }
  const prefix = segmentLine.slice(optionStartLocal, localCursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return {
    optionStart: active.segmentStart + optionStartLocal,
    prefix,
    optionEnd: active.segmentStart + optionEndLocal
  }
}
