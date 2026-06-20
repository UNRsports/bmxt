import type { UiLocale } from "../setting/locale"

/** GitHub Pages base for docs/ (privacy policy and welcome). */
export const WELCOME_PAGE_BASE_URL = "https://unrsports.github.io/bmxt/welcome.html"

export const WELCOME_LANG_QUERY_PARAM = "lang"

export function buildWelcomePageUrl(locale: UiLocale): string {
  const url = new URL(WELCOME_PAGE_BASE_URL)
  url.searchParams.set(WELCOME_LANG_QUERY_PARAM, locale)
  return url.toString()
}
