/**
 * EN: Prompt parsing / Tab zone for `search -list` (tabs-like continuation flow).
 * JA: `search -list` のプロンプト解析・Tab 補完（tabs と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"
import type { PickerEntry } from "../side-picker/model/picker-entry"

/** After `search -list ` — optional scope token `--history` | `--bookmark` | `--page`. */
const SEARCH_LIST_LEAD_RE = /^\s*search\s+-list\s+/i

const SEARCH_EXIT_LIST_RE = /^\s*search\s+-exit\s+-list\s*$/i

const SEARCH_LIST_SCOPE = new Set(["--history", "--bookmark", "--page"])

function searchListParts(trimmed: string): string[] {
  return trimmed.trim().split(/\s+/).filter((s) => s.length > 0)
}

/** EN: Optional third-token scope flags after `search -list` (manifest `trailingTokens`). */
export function isSearchListScopeToken(token: string): boolean {
  return SEARCH_LIST_SCOPE.has(token.toLowerCase())
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
 * EN: Ready to dispatch `search -list` (empty pattern, pattern, and/or optional scope).
 * JA: `search -list` の実行可能形（パターン空・パターンあり・任意スコープ付き）。
 */
export function isSearchListReadyToRun(trimmed: string): boolean {
  const parts = searchListParts(trimmed)
  if (parts.length < 2) {
    return false
  }
  if (parts[0]!.toLowerCase() !== "search" || parts[1]!.toLowerCase() !== "-list") {
    return false
  }
  if (parts.length === 2) {
    return true
  }
  const third = parts[2]!.toLowerCase()
  if (isSearchListScopeToken(third)) {
    return true
  }
  if (third.startsWith("--")) {
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
  if (!third.startsWith("--")) {
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
  return isSearchListReadyToRun(trimmed) && !isEditingSearchListScopeToken(line, cursor)
}

/** EN: Prompt placeholder after `search -list `. */
export const SEARCH_LIST_PATTERN_PLACEHOLDER =
  "絞り込み語を入力 · Enter で実行 — type a filter or press Enter to run"

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

export function searchListScopeCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, SEARCH_LIST_LEAD_RE)
}

export function listSearchListScopeCandidates(prefix: string): string[] {
  return listThirdTokenCandidates("search", "-list", prefix)
}

export type SearchListPickerState = {
  phase: "loading" | "results"
  /** EN: Shown in picker while `phase === "loading"`; cleared when results arrive. */
  progressLines: string[]
  entries: PickerEntry[]
  /** EN: When search completes with zero openable rows, show these lines instead. */
  emptyResultLines?: string[]
}
