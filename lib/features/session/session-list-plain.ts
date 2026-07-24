import { appendListPlainSummary } from "../command-line/list-output/format-plain-summary.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import type { UiLocale } from "../setting/locale.ts"
import { tSession } from "../setting/i18n/ns/session.ts"

export function formatSessionListPlainLines(
  result: ListResult,
  locale: UiLocale,
  showUrl: boolean
): string[] {
  if (result.records.length === 0) {
    return [tSession("session.list.empty", locale)]
  }
  const body = formatListPlainLines(result, { showUrl })
  return appendListPlainSummary(body, result.records.length, locale)
}
