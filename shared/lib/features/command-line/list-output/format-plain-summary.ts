import type { UiLocale } from "../../setting/locale.ts"
import { tListOutput } from "../../setting/i18n/ns/list-output.ts"

export function appendListPlainSummary(
  lines: string[],
  recordCount: number,
  locale: UiLocale
): string[] {
  if (recordCount === 0) {
    return lines
  }
  return [...lines, tListOutput("listOutput.summary", locale, { count: String(recordCount) })]
}
