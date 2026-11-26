import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseHistoryListLine, type HistoryListLineOptions } from "./history-list-parse.ts"
import { fetchHistoryListResult, formatHistoryListPlainLines } from "./history-list-plain.ts"

export type HistoryListMatch = HistoryListLineOptions

export const historyListCommand: ListCommandEntry<HistoryListMatch> = {
  id: "history",
  command: "history",
  runtime: "ui",
  matchPlain(segment) {
    return parseHistoryListLine(segment)
  },
  async fetchListResult(match, ctx) {
    return fetchHistoryListResult(match, ctx.locale)
  },
  formatPlainLines(result, locale, _match) {
    return formatHistoryListPlainLines(result, locale)
  }
}
