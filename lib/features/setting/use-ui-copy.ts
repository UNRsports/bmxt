import { useMemo } from "react"
import { pickUiLines, uiBulletPrefix, type BilingualLines } from "./locale"
import { t, type MessageKey, type MessageVars } from "./i18n/messages"
import { useUiLocale } from "./use-ui-settings"
import type { UiLocale } from "./locale"

export type UiCopy = {
  locale: UiLocale
  t: (key: MessageKey, vars?: MessageVars) => string
  lines: (entry: BilingualLines) => readonly string[]
  bulletPrefix: string
}

export function useUiCopy(): UiCopy {
  const locale = useUiLocale()
  return useMemo(
    () => ({
      locale,
      t: (key: MessageKey, vars?: MessageVars) => t(key, locale, vars),
      lines: (entry: BilingualLines) => pickUiLines(entry, locale),
      bulletPrefix: uiBulletPrefix(locale)
    }),
    [locale]
  )
}

export function useUiLocaleOrDefault(fallback: UiLocale = "ja"): UiLocale {
  try {
    return useUiLocale()
  } catch {
    return fallback
  }
}
