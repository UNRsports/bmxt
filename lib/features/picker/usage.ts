import { expandDispatchMsgs } from "../bmxt-core/expand-msgs.ts"
import type { UiLocale } from "../setting/locale.ts"

const BROWSE_USAGE_MSGS = [
  { key: "cmd.browse.usage.line1" },
  { key: "cmd.browse.usage.line2" },
  { key: "cmd.browse.usage.line3" },
  { key: "cmd.browse.usage.line4" }
] as const

/** EN: Usage lines when host needs browse usage without re-running WASM (Chrome path). */
export function browseUsageLines(locale: UiLocale): string[] {
  return expandDispatchMsgs([...BROWSE_USAGE_MSGS], locale)
}

export function browseNotListProducerLines(locale: UiLocale, segment: string): string[] {
  return expandDispatchMsgs(
    [
      { key: "cmd.browse.error.notListProducer", params: { segment } },
      ...BROWSE_USAGE_MSGS
    ],
    locale
  )
}

export function browseMixedKindsLines(locale: UiLocale): string[] {
  return expandDispatchMsgs([{ key: "cmd.browse.error.mixedKinds" }], locale)
}

export function browseEmptyLines(locale: UiLocale): string[] {
  return expandDispatchMsgs([{ key: "cmd.browse.error.empty" }], locale)
}
