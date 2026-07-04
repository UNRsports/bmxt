import type { UiLocale } from "../setting/locale.ts"
import { tCmd } from "../setting/i18n/ns/cmd.ts"

/** EN: Usage lines when `picker` runs without pipe stdin. */
export function pickerUsageLines(locale: UiLocale): string[] {
  return [
    tCmd("cmd.picker.usage.line1", locale),
    tCmd("cmd.picker.usage.line2", locale),
    tCmd("cmd.picker.usage.line3", locale),
    tCmd("cmd.picker.usage.line4", locale)
  ]
}
