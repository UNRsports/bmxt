import type { UiLocale } from "../../setting/locale"
import { tPicker } from "../../setting/i18n/ns/picker"

export const URL_LIST_PICKER_COMMANDS = ["nohlsearch"] as const

export function filterUrlListCommandCompletions(prefix: string): string[] {
  const p = prefix.trim().toLowerCase()
  if (p === "") {
    return [...URL_LIST_PICKER_COMMANDS]
  }
  return URL_LIST_PICKER_COMMANDS.filter((c) => c.startsWith(p))
}

export function urlListCommandListingHint(locale: UiLocale): string {
  return tPicker("picker.commandListing.nohlsearch", locale)
}
