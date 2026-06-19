/**
 * EN: Pure prompt parsing for `search -list` (no codegen / Chrome deps — testable).
 * JA: `search -list` のプロンプト解析（codegen・Chrome 非依存・テスト可能）。
 */

const SEARCH_EXIT_LIST_RE = /^\s*search\s+-exit\s+-list\s*$/i

const SEARCH_LIST_SCOPE = new Set(["--all", "--history", "--bookmark", "--page"])

const SEARCH_LIST_SCOPE_ORDER = ["--all", "--history", "--bookmark", "--page"] as const

const SEARCH_LIST_EFFECT_SCOPES = ["--history", "--bookmark", "--page"] as const

function searchListParts(trimmed: string): string[] {
  return trimmed.trim().split(/\s+/).filter((s) => s.length > 0)
}

/** EN: Optional third-token scope flags after `search -list` (manifest `trailingTokens`). */
export function isSearchListScopeToken(token: string): boolean {
  return SEARCH_LIST_SCOPE.has(token.toLowerCase())
}

/** EN: `--all` — cross-scope search (history + bookmark + page). */
export function isSearchListAllScopeToken(token: string): boolean {
  return token.toLowerCase() === "--all"
}

/** EN: Effect scopes dispatched for a scope token (`--all` expands to all three). */
export function searchListEffectScopesForToken(token: string): readonly string[] {
  if (isSearchListAllScopeToken(token)) {
    return SEARCH_LIST_EFFECT_SCOPES
  }
  return [token.toLowerCase()]
}

/** EN: Effect scopes when the third token is not a scope flag (pattern-only line). */
export function searchListDefaultEffectScopes(): readonly string[] {
  return SEARCH_LIST_EFFECT_SCOPES
}

/**
 * EN: Bare `search -list` → `search -list --all` for dispatch / progress labels.
 * JA: スコープ無しの `search -list` を横断検索 `--all` に正規化する。
 */
export function normalizeSearchListDispatchLine(trimmed: string): string {
  const parts = searchListParts(trimmed)
  if (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "search" &&
    parts[1]!.toLowerCase() === "-list"
  ) {
    return "search -list --all"
  }
  return trimmed.trim()
}

/**
 * EN: Third token still narrowing scope candidates (e.g. `pa` → `--page`, `--p` → `--page`).
 * JA: 第三トークンがスコープ候補の絞り込み中か（`pa` や `--p` など）。
 */
export function matchesSearchListScopeFilter(token: string): boolean {
  const t = token.trim().toLowerCase()
  if (!t) {
    return false
  }
  if (t.startsWith("--")) {
    return SEARCH_LIST_SCOPE_ORDER.some((s) => s.startsWith(t))
  }
  return SEARCH_LIST_SCOPE_ORDER.some((s) => s.includes(t))
}

/**
 * EN: `search -list ` — optional scope (`--history` / …) or pattern may follow.
 * JA: `search -list ` — 任意スコープまたはパターン入力待ち。
 */
export function isSearchListAwaitingScopeOrPattern(line: string): boolean {
  const trimmed = line.trim()
  const parts = searchListParts(trimmed)
  return (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "search" &&
    parts[1]!.toLowerCase() === "-list" &&
    line.endsWith(" ")
  )
}

/**
 * EN: `search -list` without trailing space — restore prompt to `search -list ` first.
 * JA: 末尾スペース無しの `search -list` — 先に `search -list ` へ復元する。
 */
export function isSearchListContinuationPrompt(line: string): boolean {
  const trimmed = line.trim()
  const parts = searchListParts(trimmed)
  if (
    parts.length !== 2 ||
    parts[0]!.toLowerCase() !== "search" ||
    parts[1]!.toLowerCase() !== "-list"
  ) {
    return false
  }
  return !line.endsWith(" ")
}

/**
 * EN: Ready to dispatch `search -list` (scope and/or pattern present).
 * JA: `search -list` の実行可能形（スコープ・パターンのいずれか、または継続後の空パターン）。
 */
export function isSearchListReadyToRun(trimmed: string, line?: string): boolean {
  const parts = searchListParts(trimmed)
  if (parts.length < 2) {
    return false
  }
  if (parts[0]!.toLowerCase() !== "search" || parts[1]!.toLowerCase() !== "-list") {
    return false
  }
  if (parts.length === 2) {
    return line !== undefined && line.endsWith(" ")
  }
  const third = parts[2]!.toLowerCase()
  if (isSearchListScopeToken(third)) {
    return true
  }
  if (third.startsWith("--")) {
    return false
  }
  if (matchesSearchListScopeFilter(parts[2]!)) {
    return false
  }
  return true
}

/** EN: Pattern text after `search -list` or `search -list <scope>` (may be empty). */
export function searchListPatternFromLine(trimmed: string): string {
  const parts = searchListParts(trimmed)
  if (parts.length <= 2) {
    return ""
  }
  if (isSearchListScopeToken(parts[2]!)) {
    return parts.length <= 3 ? "" : parts.slice(3).join(" ")
  }
  return parts.slice(2).join(" ")
}

function tokenBoundsAt(s: string, pos: number): [number, number] {
  let l = pos
  while (l > 0 && !/\s/.test(s[l - 1]!)) {
    l--
  }
  let r = pos
  while (r < s.length && !/\s/.test(s[r]!)) {
    r++
  }
  return [l, r]
}

/**
 * EN: Cursor still editing the optional scope token — show scope menu, not pattern placeholder.
 * JA: 任意スコープトークン入力中 — スコープメニューを表示し、パターン案内は出さない。
 */
export function isEditingSearchListScopeToken(line: string, cursor: number): boolean {
  const trimmed = line.trim()
  if (!trimmed.toLowerCase().startsWith("search ")) {
    return false
  }
  const parts = searchListParts(trimmed)
  if (parts.length < 3) {
    return false
  }
  const third = parts[2]!
  if (!matchesSearchListScopeFilter(third) && !third.startsWith("--")) {
    return false
  }
  if (!isSearchListScopeToken(third)) {
    return true
  }
  const scopeStart = line.toLowerCase().indexOf(third.toLowerCase())
  if (scopeStart < 0) {
    return false
  }
  const scopeEnd = scopeStart + third.length
  const [l, r] = tokenBoundsAt(line, cursor)
  return l >= scopeStart && r <= scopeEnd
}

/** EN: Show pattern placeholder; suppress scope IME menu. */
export function shouldShowSearchListPatternPlaceholder(line: string, cursor: number): boolean {
  const trimmed = line.trim()
  if (isSearchListContinuationPrompt(line)) {
    return false
  }
  if (!trimmed.toLowerCase().startsWith("search -list")) {
    return false
  }
  if (isEditingSearchListScopeToken(line, cursor)) {
    return false
  }
  const parts = searchListParts(trimmed)
  if (parts.length === 2 && line.endsWith(" ")) {
    return true
  }
  if (parts.length >= 3 && isSearchListScopeToken(parts[2]!)) {
    return searchListPatternFromLine(trimmed).length === 0
  }
  if (parts.length >= 3 && matchesSearchListScopeFilter(parts[2]!)) {
    return false
  }
  if (parts.length >= 3 && !parts[2]!.startsWith("--")) {
    return true
  }
  return false
}

/** `search -exit -list` — close search list picker in this pane (full line must match). */
export function parseSearchExitListLine(trimmed: string): boolean {
  return SEARCH_EXIT_LIST_RE.test(trimmed.trim())
}

/** EN: Enter opens search list picker when the line is a completed `search -list …` dispatch. */
export function parseSearchListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = searchListParts(t)
  if (parts.length < 2) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "search") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  return t
}
