/**
 * EN: Prompt parsing / Tab zone for `grep -list` (tabs-like continuation flow).
 * JA: `grep -list` のプロンプト解析・Tab 補完（tabs と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

/** After `grep -list ` — optional scope token `--none` | `--history` | … */
const GREP_LIST_LEAD_RE = /^\s*grep\s+-list\s+/i

/** EN: Enter opens grep list picker when the line is a completed `grep -list …` dispatch. */
export function parseGrepListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = t.split(/\s+/).filter((s) => s.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "grep") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  return t
}

export function grepListScopeCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, GREP_LIST_LEAD_RE)
}

export function listGrepListScopeCandidates(prefix: string): string[] {
  return listThirdTokenCandidates("grep", "-list", prefix)
}

export type GrepListPickerState = {
  lines: string[]
}
