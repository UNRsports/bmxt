const MIN_FONT_SIZE_PX = 8
const MAX_FONT_SIZE_PX = 32

/** EN: Parse terminal font size; accepts `12` or `12px`; returns normalized `Npx`. */
export function parseFontSizePx(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  const m = /^(\d+)(?:px)?$/.exec(trimmed)
  if (!m) {
    return null
  }
  const n = Number.parseInt(m[1]!, 10)
  if (!Number.isFinite(n) || n < MIN_FONT_SIZE_PX || n > MAX_FONT_SIZE_PX) {
    return null
  }
  return `${n}px`
}

export { MIN_FONT_SIZE_PX, MAX_FONT_SIZE_PX }
