/**
 * EN: Pretty-print search hits (multi-line blocks per element).
 * JA: 検索ヒットを要素ごと複数行で整形。
 */

import { stripInvisibleFormatChars } from "../bmxt-core/line-parse"

export type SearchScopeLabel = "history" | "bookmark" | "page"

/** EN: Strip optional ASCII quotes from a `search -list` pattern token sequence. */
export function normalizeSearchPattern(raw: string): string {
  const t = stripInvisibleFormatChars(raw.trim())
  const chs = [...t]
  if (chs.length >= 2) {
    const a = chs[0]
    const b = chs[chs.length - 1]
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return stripInvisibleFormatChars(chs.slice(1, -1).join("").trim())
    }
  }
  return t
}

/** One logical element → several terminal lines (each rendered as one row). */
export function linesForSearchElement(
  scope: SearchScopeLabel,
  fields: Record<string, string>
): string[] {
  const out: string[] = [`[${scope}]`]
  for (const [k, v] of Object.entries(fields)) {
    out.push(`${k}: ${v}`)
  }
  out.push("")
  return out
}
