/**
 * EN: Prompt parsing / Tab zone for `dom -list` (grep-list と同型の picker 起動フロー).
 * JA: `dom -list` のプロンプト解析・Tab 補完（`grep -list` と同型の段取り）。
 */

import { listThirdTokenCandidates } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

/** After `dom -list ` — optional flavor token `--html` | `--react` */
const DOM_LIST_LEAD_RE = /^\s*dom\s+-list\s+/i

/** EN: Enter opens dom -list picker when the line is a completed `dom -list …` dispatch. */
export function parseDomListPickerLine(trimmed: string): string | null {
  const t = trimmed.trim()
  const parts = t.split(/\s+/).filter((s) => s.length > 0)
  if (parts.length < 2) {
    return null
  }
  if (parts[0]!.toLowerCase() !== "dom") {
    return null
  }
  if (parts[1]!.toLowerCase() !== "-list") {
    return null
  }
  return t
}

export function domListFlavorCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, DOM_LIST_LEAD_RE)
}

export function listDomListFlavorCandidates(prefix: string): string[] {
  return listThirdTokenCandidates("dom", "-list", prefix)
}

export type DomListPickerState = {
  lines: string[]
}
