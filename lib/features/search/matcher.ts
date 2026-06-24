/**
 * EN: Case-insensitive substring matching for search needles.
 * JA: 検索 needle 向けの大文字小文字を区別しない部分一致。
 */

export {
  normalizeForMatch,
  stripInvisibleFormatChars
} from "../format/normalize-for-match.ts"

import { normalizeForMatch } from "../format/normalize-for-match.ts"

/** EN: Case-insensitive substring. JA: 大文字小文字を区別しない部分一致。 */
export function matchesNeedle(haystack: string, needle: string): boolean {
  if (!needle) {
    return false
  }
  return normalizeForMatch(haystack).includes(normalizeForMatch(needle))
}
