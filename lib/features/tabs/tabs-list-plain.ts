import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tTabs } from "../setting/i18n/ns/tabs.ts"
import { buildTabPickerRowsBundle } from "./picker-rows.ts"
import { tabPickerRowsToListResult } from "./tabs-list-result.ts"
import type { ListResult } from "../command-line/list-output/types.ts"

export type TabsListFetchOptions = {
  showUrl: boolean
  locale: UiLocale
}

export async function fetchTabsListResult(options: TabsListFetchOptions): Promise<ListResult> {
  const bundle = await buildTabPickerRowsBundle(options.showUrl, options.locale)
  return tabPickerRowsToListResult(bundle.rows, options.locale)
}

export function formatTabsListPlainLines(result: ListResult, locale: UiLocale, showUrl: boolean): string[] {
  if (result.records.length === 0) {
    return [tTabs("tabs.picker.empty", locale)]
  }
  const body = formatListPlainLines(result, { showUrl })
  return appendListPlainSummary(body, result.records.length, locale)
}

export async function runTabsListPlain(options: TabsListFetchOptions): Promise<string[]> {
  const result = await fetchTabsListResult(options)
  return formatTabsListPlainLines(result, options.locale, options.showUrl)
}
