/** Shorten titles for terminal / picker labels (shared SW + UI). */

import { t } from "../setting/i18n/messages"
import { getRunLocale } from "../setting/i18n/run-locale"
import type { UiLocale } from "../setting/locale"

const DISPLAY_TITLE_MAX = 96

export function displayTitle(
  raw: string | undefined | null,
  locale: UiLocale = getRunLocale()
): string {
  const trimmed = (raw || "").trim().replace(/\s+/g, " ")
  if (!trimmed) {
    return t("common.untitled", locale)
  }
  return trimmed.length > DISPLAY_TITLE_MAX ? `${trimmed.slice(0, DISPLAY_TITLE_MAX)}…` : trimmed
}
