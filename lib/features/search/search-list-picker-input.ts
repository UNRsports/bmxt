/**
 * EN: Prompt parsing / Tab zone for `search -list` (tabs-like continuation flow).
 * JA: `search -list` のプロンプト解析・Tab 補完（tabs と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import {
  pickThirdTokenCandidates,
  resolveOptionTokenFilterModes
} from "../command-line/ime-token-match.ts"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"
import type { PickerEntry } from "../side-picker/model/picker-entry"

export {
  isEditingSearchListScopeToken,
  isSearchListAllScopeToken,
  isSearchListAwaitingScopeOrPattern,
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  isSearchListScopeToken,
  matchesSearchListOptionFilter,
  matchesSearchListScopeFilter,
  normalizeSearchListDispatchLine,
  parseSearchExitListLine,
  parseSearchListPickerLine,
  searchListDefaultEffectScopes,
  searchListEffectScopesForToken,
  searchListPatternFromLine,
  shouldShowSearchListPatternPlaceholder
} from "./search-list-picker-parse"

/** After `search -list ` — scope token `--all` | `--history` | `--bookmark` | `--page` | `--snapshot`. */
const SEARCH_LIST_LEAD_RE = /^\s*search\s+-list\s+/i

export function searchListScopeCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, SEARCH_LIST_LEAD_RE)
}

export function listSearchListScopeCandidates(prefix: string): string[] {
  const all = listThirdTokenCandidates("search", "-list", "")
  const { useFullCandidateList, filterMode } = resolveOptionTokenFilterModes(
    all,
    prefix,
    "prefix"
  )
  return pickThirdTokenCandidates(all, prefix, "prefix", useFullCandidateList, filterMode)
}

export type SearchListPickerState = {
  phase: "loading" | "results"
  /** EN: Shown in picker while `phase === "loading"`; cleared when results arrive. */
  progressLines: string[]
  entries: PickerEntry[]
  /** EN: Normalized pattern from the dispatch line (`search -list …`). */
  pattern: string
  /** EN: When search completes with zero openable rows, show these lines instead. */
  emptyResultLines?: string[]
}
