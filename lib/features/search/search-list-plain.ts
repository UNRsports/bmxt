import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { applyChromeEffects, type DispatchChromeContext } from "../dispatch"
import type { UiLocale } from "../setting/locale.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import { enrichSearchPickerEntriesFromOpenTabs } from "./enrich-search-entries-from-tabs.ts"
import { searchEffectsForDispatchLine } from "./search-list-effects.ts"
import { buildSearchListResult } from "./search-list-result.ts"
import { normalizeSearchListDispatchLine, searchListPatternFromLine } from "./search-list-picker-parse.ts"
import { normalizeSearchPattern } from "./search-format.ts"
import { pickerEntriesFromSearchLines } from "../side-picker/model/from-search-lines.ts"

export type SearchListFetchOptions = {
  dispatchLine: string
  locale: UiLocale
  ctx: DispatchChromeContext
}

export async function fetchSearchListResult(options: SearchListFetchOptions): Promise<ListResult> {
  const dispatchLine = normalizeSearchListDispatchLine(options.dispatchLine)
  const pattern = normalizeSearchPattern(searchListPatternFromLine(dispatchLine))
  const effects = searchEffectsForDispatchLine(dispatchLine)
  const linesOut = await applyChromeEffects(options.ctx, effects)
  const parsed = pickerEntriesFromSearchLines(linesOut)
  const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, pattern)
  return buildSearchListResult(entries, pattern)
}

export function formatSearchListPlainLines(result: ListResult, locale: UiLocale): string[] {
  if (result.records.length === 0) {
    return [tSearch("search.list.empty", locale)]
  }
  const body = formatListPlainLines(result)
  return appendListPlainSummary(body, result.records.length, locale)
}

export async function runSearchListPlain(options: SearchListFetchOptions): Promise<string[]> {
  const result = await fetchSearchListResult(options)
  return formatSearchListPlainLines(result, options.locale)
}
