import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tTabs } from "../setting/i18n/ns/tabs.ts"
import { expandSyncLogLines } from "../sync/facade/expand-sync-log.ts"
import type { DeviceListScope } from "../sync/bus/device-list-scope.ts"
import { fetchCrossDeviceTabsList } from "../sync/bus/fetch-cross-device-tabs.ts"
import { buildTabPickerRowsBundle } from "./picker-rows.ts"
import { tabPickerRowsToListResult } from "./tabs-list-result.ts"
import type { ListResult } from "../command-line/list-output/types.ts"

export type TabsListFetchOptions = {
  showUrl: boolean
  locale: UiLocale
  scope?: DeviceListScope
}

export async function fetchTabsListResult(options: TabsListFetchOptions): Promise<ListResult> {
  const scope = options.scope ?? { kind: "local" }
  if (scope.kind === "local") {
    const bundle = await buildTabPickerRowsBundle(options.showUrl, options.locale)
    return tabPickerRowsToListResult(bundle.rows, options.locale)
  }
  const fetched = await fetchCrossDeviceTabsList({
    showUrl: options.showUrl,
    locale: options.locale,
    scope
  })
  return fetched.result
}

export async function fetchTabsListResultWithNotices(
  options: TabsListFetchOptions
): Promise<{ result: ListResult; noticeLines: string[] }> {
  const scope = options.scope ?? { kind: "local" }
  if (scope.kind === "local") {
    const result = await fetchTabsListResult(options)
    return { result, noticeLines: [] }
  }
  const fetched = await fetchCrossDeviceTabsList({
    showUrl: options.showUrl,
    locale: options.locale,
    scope
  })
  return {
    result: fetched.result,
    noticeLines: expandSyncLogLines(fetched.notices, options.locale)
  }
}

export function formatTabsListPlainLines(result: ListResult, locale: UiLocale, showUrl: boolean): string[] {
  if (result.records.length === 0) {
    return [tTabs("tabs.picker.empty", locale)]
  }
  const body = formatListPlainLines(result, { showUrl })
  return appendListPlainSummary(body, result.records.length, locale)
}

export async function runTabsListPlain(options: TabsListFetchOptions): Promise<string[]> {
  const { result, noticeLines } = await fetchTabsListResultWithNotices(options)
  return [...noticeLines, ...formatTabsListPlainLines(result, options.locale, options.showUrl)]
}
