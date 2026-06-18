import type { UiLocale } from "../../setting/locale"
import { t } from "../../setting/i18n/messages"

export const URL_LIST_PICKER_COMMANDS = ["nohlsearch"] as const

export function filterUrlListCommandCompletions(prefix: string): string[] {
  const p = prefix.trim().toLowerCase()
  if (p === "") {
    return [...URL_LIST_PICKER_COMMANDS]
  }
  return URL_LIST_PICKER_COMMANDS.filter((c) => c.startsWith(p))
}

export function urlListCommandListingHint(locale: UiLocale): string {
  return t("picker.commandListing.nohlsearch", locale)
}
