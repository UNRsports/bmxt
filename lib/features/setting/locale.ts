/** EN: UI display locale (not translation API pair). */

export const UI_LOCALE_IDS = ["ja", "en"] as const

export type UiLocale = (typeof UI_LOCALE_IDS)[number]

export const UI_LOCALE_SETTING_TOKENS = ["--japanese", "--english"] as const

export type UiLocaleSettingToken = (typeof UI_LOCALE_SETTING_TOKENS)[number]

export const DEFAULT_UI_LOCALE: UiLocale = "ja"

const LOCALE_BY_TOKEN = new Map<string, UiLocale>([
  ["--japanese", "ja"],
  ["--english", "en"]
])

const TOKEN_BY_LOCALE: Record<UiLocale, UiLocaleSettingToken> = {
  ja: "--japanese",
  en: "--english"
}

export type BilingualUiLabel = {
  readonly ja: string
  readonly en: string
}

export function parseUiLocaleSettingToken(token: string): UiLocale | null {
  const key = token.trim().toLowerCase()
  return LOCALE_BY_TOKEN.get(key) ?? null
}

export function settingTokenForUiLocale(locale: UiLocale): UiLocaleSettingToken {
  return TOKEN_BY_LOCALE[locale]
}

export function parseUiLocale(raw: unknown): UiLocale {
  if (raw === "en") {
    return "en"
  }
  return DEFAULT_UI_LOCALE
}

export function pickUiLabel(label: BilingualUiLabel, locale: UiLocale): string {
  return locale === "en" ? label.en : label.ja
}

export function listUiLocaleSettingTokens(): readonly UiLocaleSettingToken[] {
  return UI_LOCALE_SETTING_TOKENS
}
