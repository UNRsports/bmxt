/**
 * EN: Pretty-print find hits (multi-line blocks per element).
 * JA: find ヒットを要素ごと複数行で整形。
 */

export type FindScopeLabel = "history" | "bookmark" | "page"

/** One logical element → several terminal lines (each rendered as one row). */
export function linesForFindElement(
  scope: FindScopeLabel,
  fields: Record<string, string>
): string[] {
  const out: string[] = [`[${scope}]`]
  for (const [k, v] of Object.entries(fields)) {
    out.push(`${k}: ${v}`)
  }
  out.push("")
  return out
}
