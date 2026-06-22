import type { UiLocale } from "../locale"
import { tDom } from "./ns/dom"
import { tSearch } from "./ns/search"

export function searchListPickerHeadline(locale: UiLocale): string {
  return tSearch("search.picker.headline.list", locale)
}

export function searchListPickerDetailHeadline(locale: UiLocale): string {
  return tSearch("search.picker.headline.detail", locale)
}

export function searchListPickerDestinationHeadline(locale: UiLocale): string {
  return tSearch("search.picker.headline.destination", locale)
}

export function searchListPickerLoadingHeadline(locale: UiLocale): string {
  return tSearch("search.picker.headline.loading", locale)
}

export function domListPickerHeadline(locale: UiLocale): string {
  return tDom("dom.picker.headline", locale)
}
