/** BMXt プロンプト上の `split` サブオプション Tab 補完。 */

import { listSecondTokenCandidatesByCommand } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

const SPLIT_OPTION_LEAD_RE = /^\s*split\s+/i

/**
 * カーソルが `split ` の直後の単一トークン（`-col` / `-row` の入力途中）にあるとき、その範囲を返す。
 */
export function splitOptionCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, SPLIT_OPTION_LEAD_RE)
}

export function listSplitOptionCandidates(prefix: string): string[] {
  return listSecondTokenCandidatesByCommand("split", prefix)
}
