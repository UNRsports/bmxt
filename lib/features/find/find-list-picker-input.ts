/**
 * EN: Prompt parsing / Tab zone for `find -list` (tabs-like continuation flow).
 * JA: `find -list` のプロンプト解析・Tab 補完（tabs と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

/** After `find -list ` — optional scope token `--none` | `--history` | … */
const FIND_LIST_LEAD_RE = /^\s*find\s+-list\s+/i

/** EN: Enter opens find list picker when the line is a completed `find -list …` dispatch. */
export function parseFindListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = t.split(/\s+/).filter((s) => s.length > 0)
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
