/**
 * EN: Prompt parsing / Tab zone for `find -list` (tabs-like continuation flow).
 * JA: `find -list` のプロンプト解析・Tab 補完（tabs と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

/** After `find -list ` — optional scope token `--none` | `--history` | … */
const FIND_LIST_LEAD_RE = /^\s*find\s+-list\s+/i

const FIND_EXIT_LIST_RE = /^\s*find\s+-exit\s+-list\s*$/i

const FIND_LIST_SCOPE = new Set(["--none", "--history", "--bookmark", "--page"])

function findListParts(trimmed: string): string[] {
  return trimmed.trim().split(/\s+/).filter((s) => s.length > 0)
}

/** EN: Third-token scope flags after `find -list` (manifest `trailingTokens`). */
export function isFindListScopeToken(token: string): boolean {
  return FIND_LIST_SCOPE.has(token.toLowerCase())
}

/**
 * EN: `find -list` only — show scope menu (`--history`, …); do not auto-run until scope is chosen.
 * JA: `find -list` のみ — スコープを選ぶまで実行しない。
 */
export function isFindListAwaitingScope(trimmed: string): boolean {
  const parts = findListParts(trimmed)
  return (
    parts.length === 2 &&
    parts[0]!.toLowerCase() === "find" &&
    parts[1]!.toLowerCase() === "-list"
  )
}

/**
 * EN: Ready to dispatch `find -list` (scope token present; pattern may be empty).
 * JA: `find -list` の実行可能形（スコープ付き。パターン空可）。
 */
export function isFindListReadyToRun(trimmed: string): boolean {
  const parts = findListParts(trimmed)
  if (parts.length < 3) {
    return false
  }
  if (parts[0]!.toLowerCase() !== "find" || parts[1]!.toLowerCase() !== "-list") {
    return false
  }
  return isFindListScopeToken(parts[2]!)
}

/** EN: Pattern text after `find -list <scope>` (may be empty). */
export function findListPatternFromLine(trimmed: string): string {
  const parts = findListParts(trimmed)
  if (parts.length <= 3) {
    return ""
  }
  return parts.slice(3).join(" ")
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
 * EN: Cursor still editing the scope token (`--history` …) — show scope menu, not pattern placeholder.
 * JA: スコープトークン入力中 — スコープメニューを表示し、パターン案内は出さない。
 */
export function isEditingFindListScopeToken(line: string, cursor: number): boolean {
  const trimmed = line.trim()
  if (!trimmed.toLowerCase().startsWith("find ")) {
    return false
  }
  const parts = findListParts(trimmed)
  if (parts.length < 3) {
    return true
  }
  if (!isFindListScopeToken(parts[2]!)) {
    return true
  }
  const scope = parts[2]!
  const scopeStart = line.toLowerCase().indexOf(scope.toLowerCase())
  if (scopeStart < 0) {
    return false
  }
  const scopeEnd = scopeStart + scope.length
  const [l, r] = tokenBoundsAt(line, cursor)
  return l >= scopeStart && r <= scopeEnd
}

/** EN: Show pattern placeholder; suppress scope IME menu. */
export function shouldShowFindListPatternPlaceholder(line: string, cursor: number): boolean {
  return isFindListReadyToRun(line.trim()) && !isEditingFindListScopeToken(line, cursor)
}

/** EN: Prompt placeholder after scope is chosen on `find -list`. */
export const FIND_LIST_PATTERN_PLACEHOLDER =
  "絞り込み語を入力 · Enter で実行 — type a filter or press Enter to run"

/** `find -exit -list` — close find list picker in this pane (full line must match). */
export function parseFindExitListLine(trimmed: string): boolean {
  return FIND_EXIT_LIST_RE.test(trimmed.trim())
}

/** EN: Enter opens find list picker when the line is a completed `find -list …` dispatch. */
export function parseFindListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = findListParts(t)
  if (parts.length < 2) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "find") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  return t
}

export function findListScopeCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, FIND_LIST_LEAD_RE)
}

export function listFindListScopeCandidates(prefix: string): string[] {
  return listThirdTokenCandidates("find", "-list", prefix)
}

export type FindListPickerState = {
  lines: string[]
}
