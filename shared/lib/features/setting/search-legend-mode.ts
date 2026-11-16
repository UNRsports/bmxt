/**
 * EN: How search picker / `search -list` scope legends are shown
 *     (`[history]`, emoji, or both).
 * JA: 検索ピッカーおよび `search -list` のスコープ凡例の表示形式。
 */

export const SEARCH_LEGEND_MODE_TOKENS = ["text", "emoji", "text_emoji"] as const

export type SearchLegendMode = (typeof SEARCH_LEGEND_MODE_TOKENS)[number]

/** EN: Default — bracket text only (`[history]`), matching pre-icon behavior. */
export const DEFAULT_SEARCH_LEGEND_MODE: SearchLegendMode = "text"

/** EN: Scope emoji icons for search legends (history / bookmark / page / snapshot). */
export const SEARCH_SCOPE_ICONS = {
  history: "⏱️",
  bookmark: "🔖",
  page: "📄",
  snapshot: "📷️"
} as const

export type SearchLegendScope = keyof typeof SEARCH_SCOPE_ICONS

export function isSearchLegendMode(raw: unknown): raw is SearchLegendMode {
  return raw === "text" || raw === "emoji" || raw === "text_emoji"
}

/** EN: Normalize stored / imported search legend mode (missing → text). */
export function normalizeSearchLegendMode(raw: unknown): SearchLegendMode {
  if (isSearchLegendMode(raw)) {
    return raw
  }
  return DEFAULT_SEARCH_LEGEND_MODE
}

export function isSearchLegendScope(raw: string): raw is SearchLegendScope {
  return (
    raw === "history" || raw === "bookmark" || raw === "page" || raw === "snapshot"
  )
}

/**
 * EN: One scope token inside brackets, e.g. `history`, `⏱️`, or `⏱️ history`.
 * JA: 括弧内の1スコープ分（テキスト／絵文字／併用）。
 */
export function formatSearchLegendScopeToken(
  scope: string,
  mode: SearchLegendMode
): string {
  if (!isSearchLegendScope(scope)) {
    return scope
  }
  const icon = SEARCH_SCOPE_ICONS[scope]
  if (mode === "emoji") {
    return icon
  }
  if (mode === "text_emoji") {
    return `${icon} ${scope}`
  }
  return scope
}

/**
 * EN: Full bracket legend for one or more scopes, e.g. `[⏱️ history, 📄 page]`.
 * JA: 1件以上のスコープをまとめた括弧付き凡例。
 */
export function formatSearchLegendLabel(
  scopes: readonly string[],
  mode: SearchLegendMode
): string {
  if (scopes.length === 0) {
    return "[]"
  }
  const parts = scopes.map((scope) => formatSearchLegendScopeToken(scope, mode))
  return `[${parts.join(", ")}]`
}
