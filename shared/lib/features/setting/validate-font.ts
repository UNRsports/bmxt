const FONT_FAMILY_MAX_LEN = 200
const FONT_FAMILY_RE = /^[\w \-,'"]+$/

/** EN: Sanitize a CSS font-family stack (ASCII letters, digits, space, comma, hyphen, quotes). */
export function parseFontFamily(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > FONT_FAMILY_MAX_LEN) {
    return null
  }
  if (!FONT_FAMILY_RE.test(trimmed)) {
    return null
  }
  return trimmed
}
