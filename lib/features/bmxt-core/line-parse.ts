/** IME 等がトークン内外に挿す不可視文字を除去 */
export function stripInvisibleFormatChars(s: string): string {
  return [...s]
    .filter(
      (c) =>
        !(
          c === "\uFEFF" ||
          c === "\u200B" ||
          c === "\u200E" ||
          c === "\u200F" ||
          c === "\u202A" ||
          c === "\u202B" ||
          c === "\u202C" ||
          c === "\u202D" ||
          c === "\u202E" ||
          c === "\u2066" ||
          c === "\u2067" ||
          c === "\u2068" ||
          c === "\u2069"
        )
    )
    .join("")
}

export function tokenize(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .map((w) => stripInvisibleFormatChars(w.trim()))
    .filter((s) => s.length > 0)
}

export function parseHttpUrlCandidate(inner: string): string | null {
  const t = inner.trim()
  if (!t || /\s/.test(t)) {
    return null
  }
  const lower = t.toLowerCase()
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return null
  }
  return t
}
