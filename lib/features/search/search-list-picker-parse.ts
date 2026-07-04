/**
 * EN: Pure prompt parsing for `search -list` (no codegen / Chrome deps — testable).
 * JA: `search -list` のプロンプト解析（codegen・Chrome 非依存・テスト可能）。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import { wordBounds } from "../format/word-bounds.ts"

const SEARCH_EXIT_LIST_RE = /^\s*search\s+-exit\s+-list\s*$/i

const SEARCH_LIST_SCOPE = new Set(["--all", "--history", "--bookmark", "--page", "--snapshot"])

const SEARCH_LIST_SCOPE_ORDER = ["--all", "--history", "--bookmark", "--page", "--snapshot"] as const

/** EN: All fixed third tokens after `search -list` (scopes + `--picker`). */
export const SEARCH_LIST_OPTION_TOKENS = [
  ...SEARCH_LIST_SCOPE_ORDER,
  "--picker"
] as const

const SEARCH_LIST_EFFECT_SCOPES = ["--history", "--bookmark", "--page", "--snapshot"] as const

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
  return matchesSearchListOptionFilter(token, SEARCH_LIST_SCOPE_ORDER)
}

/**
 * EN: Third token still narrowing any `search -list` option (`pi` → `--picker`, `pa` → `--page`).
 * JA: `search -list` の任意オプション絞り込み中か（`--picker` 含む）。
 */
export function matchesSearchListOptionFilter(
  token: string,
  candidates: readonly string[] = SEARCH_LIST_OPTION_TOKENS
): boolean {
  const t = token.trim().toLowerCase()
  if (!t) {
    return false
  }
  const tBody = t.replace(/^-+/, "")
  for (const candidate of candidates) {
    const c = candidate.toLowerCase()
    const cBody = c.replace(/^-+/, "")
    if (t.startsWith("-")) {
      if (c.startsWith(t) || (tBody.length > 0 && cBody.startsWith(tBody))) {
        return true
      }
      continue
    }
    if (cBody.startsWith(tBody)) {
      return true
    }
    if (tBody.length >= 2 && (c.includes(t) || cBody.includes(tBody))) {
      return true
    }
  }
  return false
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
  if (third === "--picker") {
    return true
  }
  if (third.startsWith("--")) {
    return false
  }
  if (matchesSearchListOptionFilter(parts[2]!)) {
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

/**
 * EN: Cursor still editing a fixed option token — show option menu, not pattern placeholder.
 * JA: 固定オプショントークン入力中 — オプションメニューを表示し、パターン案内は出さない。
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
  if (!matchesSearchListOptionFilter(third) && !third.startsWith("--")) {
    return false
  }
  const isCompleteOption =
    isSearchListScopeToken(third) || third.toLowerCase() === "--picker"
  if (!isCompleteOption) {
    return true
  }
  const scopeStart = line.toLowerCase().indexOf(third.toLowerCase())
  if (scopeStart < 0) {
    return false
  }
  const scopeEnd = scopeStart + third.length
  const [l, r] = wordBounds(line, cursor)
  return l >= scopeStart && r <= scopeEnd
}

/** EN: Show pattern placeholder; suppress scope IME menu. */
export function shouldShowSearchListPatternPlaceholder(line: string, cursor: number): boolean {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const segmentCursor = active.localCursor
  const trimmed = segmentLine.trim()
  if (isSearchListContinuationPrompt(segmentLine)) {
    return false
  }
  if (!trimmed.toLowerCase().startsWith("search -list")) {
    return false
  }
  if (isEditingSearchListScopeToken(segmentLine, segmentCursor)) {
    return false
  }
  const parts = searchListParts(trimmed)
  if (parts.length === 2 && segmentLine.endsWith(" ")) {
    return true
  }
  if (parts.length >= 3 && isSearchListScopeToken(parts[2]!)) {
    return searchListPatternFromLine(trimmed).length === 0
  }
  if (parts.length >= 3 && parts[2]!.toLowerCase() === "--picker") {
    return false
  }
  if (parts.length >= 3 && matchesSearchListOptionFilter(parts[2]!)) {
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

export { parseSearchListPickerLine } from "./search-list-parse.ts"
