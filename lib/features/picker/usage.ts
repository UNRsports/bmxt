import type { UiLocale } from "../setting/locale.ts"
import { tCmd } from "../setting/i18n/ns/cmd.ts"

/** EN: Usage lines when `browse` runs without pipe stdin. */
export function browseUsageLines(locale: UiLocale): string[] {
  return [
    tCmd("cmd.browse.usage.line1", locale),
    tCmd("cmd.browse.usage.line2", locale),
    tCmd("cmd.browse.usage.line3", locale),
    tCmd("cmd.browse.usage.line4", locale)
  ]
}
