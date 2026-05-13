/**
 * EN: One terminal line per hit (tab-separated for easy copy).
 * JA: ヒット1行1レコード（タブ区切りでコピーしやすく）。
 */

export type GrepScopeLabel = "history" | "bookmark" | "page"

export function formatGrepLine(
  scope: GrepScopeLabel,
  source: string,
  detail: string
): string {
  return `${scope}\t${source}\t${detail}`
}
