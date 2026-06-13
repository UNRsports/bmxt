import raw from "./messages.json"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../locale"
import { formatMessage, type MessageVars } from "./format-message"

export type MessageKey = keyof typeof raw

export type { MessageVars } from "./format-message"
export { formatMessage } from "./format-message"

const MESSAGES = raw as Record<MessageKey, Partial<Record<UiLocale, string>>>

export function t(key: MessageKey, locale: UiLocale, vars?: MessageVars): string {
  const entry = MESSAGES[key]
  if (!entry) {
    return key
  }
  const template =
    entry[locale] ?? entry[DEFAULT_UI_LOCALE] ?? entry.en ?? entry.ja ?? String(key)
  if (!vars) {
    return template
  }
  return formatMessage(template, vars)
}

export function hasMessageKey(key: string): key is MessageKey {
  return key in MESSAGES
}

export function listMessageKeys(): MessageKey[] {
  return Object.keys(MESSAGES) as MessageKey[]
}
