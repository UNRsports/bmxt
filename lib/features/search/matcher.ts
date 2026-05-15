/**
 * EN: Strip invisible directional / format chars (IME / copy-paste), then NFKC + lowercase.
 * JA: IME・コピペ由来の不可視文字を除き、NFKC と小文字化で揃える。
 */

/** EN: Strip invisible format chars from search tokens. JA: 検索トークンから不可視書式文字を除去。 */
export function stripInvisibleFormatChars(s: string): string {
  return s.replace(/[\uFEFF\u200B\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, "")
}

export function normalizeForMatch(s: string): string {
  const t = stripInvisibleFormatChars(s)
  try {
    return t.normalize("NFKC").toLowerCase()
  } catch {
    return t.toLowerCase()
  }
}

/** EN: Case-insensitive substring. JA: 大文字小文字を区別しない部分一致。 */
export function matchesNeedle(haystack: string, needle: string): boolean {
  if (!needle) {
    return false
  }
  return normalizeForMatch(haystack).includes(normalizeForMatch(needle))
}
