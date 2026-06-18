import type { UiLocale } from "../locale"
import { t } from "./messages"

export function searchListPickerHeadline(locale: UiLocale): string {
  return t("search.picker.headline.list", locale)
}

export function searchListPickerDetailHeadline(locale: UiLocale): string {
  return t("search.picker.headline.detail", locale)
}

export function searchListPickerDestinationHeadline(locale: UiLocale): string {
  return t("search.picker.headline.destination", locale)
}

export function searchListPickerLoadingHeadline(locale: UiLocale): string {
  return t("search.picker.headline.loading", locale)
}

export function domListPickerHeadline(locale: UiLocale): string {
  return t("dom.picker.headline", locale)
}
