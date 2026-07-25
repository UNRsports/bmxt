import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import type { UiLocale } from "./locale.ts"
import { tSetting } from "./i18n/ns/setting.ts"

export function formatSettingListPlainLines(result: ListResult, locale: UiLocale): string[] {
  if (result.records.length === 0) {
    return [tSetting("setting.list.empty", locale)]
  }
  const notice = [
    tSetting("setting.list.notice.showing", locale),
    tSetting("setting.list.notice.useBrowse", locale),
    ""
  ]
  const body = formatListPlainLines(result)
  return appendListPlainSummary([...notice, ...body], result.records.length, locale)
}
