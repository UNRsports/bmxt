/** EN: History picker flat rows (month → day → visit), tab-picker style. */

import type { HistoryCacheEntry } from "../search/cache/types.ts"
import { resolveHistoryEntriesForSearch } from "../search/cache/search-cache-store.ts"
import type { UiLocale } from "../setting/locale.ts"
import { getRunLocale } from "../setting/i18n/run-locale.ts"
import { displayTitle } from "../format/display-title.ts"
import {
  buildHistoryPickerRowsFromEntriesWith,
  type HistoryPickerRow
} from "./picker-rows-build.ts"

export type { HistoryPickerRow } from "./picker-rows-build.ts"
export { historyDayKeyFromMs, historyMonthKeyFromMs } from "./picker-rows-build.ts"

export type HistoryPickerRowsOptions = {
  /** EN: Optional case-insensitive substring filter on title/url. */
  pattern?: string
  locale?: UiLocale
}

/**
 * EN: Bucket visits into month → day → visit rows (newest first).
 * JA: 訪問を月→日→訪問の行にバケツする（新しい順）。
 */
export function buildHistoryPickerRowsFromEntries(
  entries: readonly HistoryCacheEntry[],
  options: HistoryPickerRowsOptions = {}
): HistoryPickerRow[] {
  const locale = options.locale ?? getRunLocale()
  return buildHistoryPickerRowsFromEntriesWith(entries, {
    pattern: options.pattern,
    locale,
    formatVisitTitle: (title) => displayTitle(title, locale)
  })
}

export async function buildHistoryPickerRows(
  options: HistoryPickerRowsOptions = {}
): Promise<HistoryPickerRow[]> {
  const pattern = (options.pattern ?? "").trim()
  const resolved = await resolveHistoryEntriesForSearch(pattern)
  return buildHistoryPickerRowsFromEntries(resolved.entries, options)
}
