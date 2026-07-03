import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { resolveTargetTabForActiveWindow } from "../page-dom/resolve-target-tab.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tDomList } from "../setting/i18n/ns/dom-list.ts"
import { captureDomListForTab } from "./dom-list-capture.ts"
import { domCaptureToListResult } from "./dom-list-result.ts"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode.ts"

export type DomListFetchOptions = {
  flavor: DomListFlavor
  pattern: string
  pickerMode: DomPickerMode
  showTag: boolean
  locale: UiLocale
}

export async function fetchDomListResult(options: DomListFetchOptions): Promise<ListResult> {
  const tab = await resolveTargetTabForActiveWindow()
  if (tab === undefined) {
    return {
      schema: "bmxt-list/1",
      command: "dom",
      subcommand: "-list",
      records: [
        {
          kind: "dom.notice",
          fields: { notice: "no_target" },
          display: { label: tDomList("domList.noTarget", options.locale) }
        }
      ]
    }
  }
  const capture = await captureDomListForTab(
    tab,
    options.flavor,
    options.pattern,
    options.locale,
    options.pickerMode,
    options.showTag
  )
  return domCaptureToListResult(capture, options)
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
