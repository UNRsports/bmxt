import type { UiLocale } from "../setting/locale"

/** GitHub Pages base for docs/ (privacy policy and welcome). */
export const WELCOME_PAGE_BASE_URL = "https://unrsports.github.io/bmxt/welcome.html"

export const WELCOME_LANG_QUERY_PARAM = "lang"

/** Installed extension manifest version; welcome.html shows history through this version. */
export const WELCOME_VERSION_QUERY_PARAM = "v"

const WELCOME_VERSION_PARAM_RE = /^\d+(\.\d+)*$/

export function isValidWelcomeVersionParam(version: string): boolean {
  return WELCOME_VERSION_PARAM_RE.test(version.trim())
}

export function buildWelcomePageUrl(locale: UiLocale, manifestVersion: string): string {
  const url = new URL(WELCOME_PAGE_BASE_URL)
  url.searchParams.set(WELCOME_LANG_QUERY_PARAM, locale)
  const trimmed = manifestVersion.trim()
  if (isValidWelcomeVersionParam(trimmed)) {
    url.searchParams.set(WELCOME_VERSION_QUERY_PARAM, trimmed)
  }
  return url.toString()
}
