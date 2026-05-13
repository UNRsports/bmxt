/** Cursor is in the first option token immediately after a `leadPattern` match (e.g. `tabs `, `split `). */

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
  const m = leadPattern.exec(line)
  if (!m) {
    return null
  }
  const optionStart = m.index + m[0].length
  if (cursor < optionStart) {
    return null
  }
  const optionEnd = optionStart + (line.slice(optionStart).match(/^[^\s]*/)?.[0].length ?? 0)
  if (cursor > optionEnd) {
    return null
  }
  const prefix = line.slice(optionStart, cursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return { optionStart, prefix, optionEnd }
}
