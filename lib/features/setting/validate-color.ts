const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function expandHexDigits(digits: string): string {
  if (digits.length === 3) {
    return digits
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (digits.length === 6) {
    return digits
  }
  return digits.slice(0, 6)
}

/** EN: Accept web hex colors only (`#rgb`, `#rrggbb`, `#rrggbbaa`); normalize to `#rrggbb`. */
export function parseHexColor(raw: string): string | null {
  const trimmed = raw.trim()
  if (!HEX_COLOR_RE.test(trimmed)) {
    return null
  }
  const digits = trimmed.slice(1)
  const expanded = expandHexDigits(digits)
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null
  }
  return `#${expanded.toLowerCase()}`
}

/** EN: Lenient hex for live preview while the user is still typing. */
export function previewHexColor(raw: string): string | null {
  const validated = parseHexColor(raw)
  if (validated !== null) {
    return validated
  }
  const trimmed = raw.trim()
  const partial = /^#([0-9a-fA-F]{1,5})$/.exec(trimmed)
  if (!partial) {
    return null
  }
  const digits = partial[1]!
  const padded = `${digits}${"0".repeat(6)}`.slice(0, 6)
  return `#${padded.toLowerCase()}`
}
