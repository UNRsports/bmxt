/**
 * EN: Normalize for substring search (NFKC unifies compat chars; toLowerCase for ASCII case).
 * JA: 部分一致用の正規化（NFKC で互換文字を揃え、ASCII 大小は toLowerCase）。
 */

export function normalizeForMatch(s: string): string {
  try {
    return s.normalize("NFKC").toLowerCase()
  } catch {
    return s.toLowerCase()
  }
}

/** EN: Case-insensitive substring. JA: 大文字小文字を区別しない部分一致。 */
export function matchesNeedle(haystack: string, needle: string): boolean {
  if (!needle) {
    return false
  }
  return normalizeForMatch(haystack).includes(normalizeForMatch(needle))
}
