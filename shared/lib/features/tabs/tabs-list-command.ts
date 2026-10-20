import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseTabsListLine } from "./tabs-list-parse.ts"
import { fetchTabsListResult, formatTabsListPlainLines } from "./tabs-list-plain.ts"

export type TabsListMatch = {
  showUrl: boolean
}

export const tabsListCommand: ListCommandEntry<TabsListMatch> = {
  id: "tabs",
  command: "tab",
  runtime: "service_worker",
  matchPlain(segment) {
    const parsed = parseTabsListLine(segment)
    if (parsed === null) {
      return null
    }
    return { showUrl: parsed.showUrl }
  },
  async fetchListResult(match, ctx) {
    return fetchTabsListResult({ showUrl: match.showUrl, locale: ctx.locale })
  },
  formatPlainLines(result, locale, match) {
    return formatTabsListPlainLines(result, locale, match.showUrl)
  }
}
