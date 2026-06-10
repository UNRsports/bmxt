import { useMemo } from "react"
import {
  pickUiLabel,
  pickUiLines,
  uiBulletPrefix,
  type BilingualLines,
  type BilingualUiLabel,
  type UiLocale
} from "./locale"
import { useUiLocale } from "./use-ui-settings"

export function useUiCopy() {
  const locale = useUiLocale()
  return useMemo(
    () => ({
      locale,
      t: (label: BilingualUiLabel) => pickUiLabel(label, locale),
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
