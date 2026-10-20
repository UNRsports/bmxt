export { stripInvisibleFormatChars } from "../format/normalize-for-match.ts"

import { stripInvisibleFormatChars } from "../format/normalize-for-match.ts"

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
