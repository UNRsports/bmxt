import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import type { DeviceListScope } from "../sync/bus/device-list-scope.ts"
import { parseTabsListLine } from "./tabs-list-parse.ts"
import { fetchTabsListResult, formatTabsListPlainLines } from "./tabs-list-plain.ts"

export type TabsListMatch = {
  showUrl: boolean
  scope: DeviceListScope
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
    return { showUrl: parsed.showUrl, scope: parsed.scope }
  },
  async fetchListResult(match, ctx) {
    return fetchTabsListResult({
      showUrl: match.showUrl,
      locale: ctx.locale,
      scope: match.scope
    })
  },
  formatPlainLines(result, locale, match) {
    return formatTabsListPlainLines(result, locale, match.showUrl)
  }
}
