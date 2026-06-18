import { DEFAULT_UI_LOCALE, type UiLocale } from "../locale"

let currentRunLocale: UiLocale = DEFAULT_UI_LOCALE

/** EN: Thread-local locale for Service Worker / WASM command dispatch (no React context). */
export function setRunLocale(locale: UiLocale): void {
  currentRunLocale = locale
}

export function getRunLocale(): UiLocale {
  return currentRunLocale
}
