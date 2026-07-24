import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tDomList } from "../setting/i18n/ns/dom-list.ts"
import type { DomListCapture } from "./dom-list-capture.ts"
import { fetchDomListResultUnified, type DomListMatch } from "./dom-list-fetch.ts"

export type DomListFetchOptions = DomListMatch & {
  locale: UiLocale
  resolveTab?: () => Promise<chrome.tabs.Tab | undefined>
  onCapture?: (capture: DomListCapture) => void
}

export async function fetchDomListResult(options: DomListFetchOptions): Promise<ListResult> {
  return fetchDomListResultUnified(options)
}

export function formatDomListPlainLines(result: ListResult, locale: UiLocale): string[] {
  if (result.records.length === 0) {
    return [tDomList("domList.empty", locale)]
  }
  const body = formatListPlainLines(result)
  return appendListPlainSummary(body, result.records.length, locale)
}

export async function runDomListPlain(options: DomListFetchOptions): Promise<string[]> {
  const result = await fetchDomListResult(options)
  return formatDomListPlainLines(result, options.locale)
}
