/** EN: Plain-line formatting + fetch for `history -list`. */

import type { UiLocale } from "../setting/locale.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import { historyPickerRowsToListResult } from "./history-list-result.ts"
import { buildHistoryPickerRows } from "./picker-rows.ts"
import type { HistoryListLineOptions } from "./history-list-parse.ts"

export async function fetchHistoryListResult(
  match: HistoryListLineOptions,
  locale: UiLocale
): Promise<ListResult> {
  if (match.scope.kind !== "local") {
    return {
      schema: "bmxt-list/1",
      command: "history",
      subcommand: "-list",
      records: []
    }
  }
  const rows = await buildHistoryPickerRows({
    pattern: match.pattern,
    locale
  })
  return historyPickerRowsToListResult(rows)
}

export function formatHistoryListPlainLines(result: ListResult, _locale: UiLocale): string[] {
  return formatListPlainLines(result)
}
