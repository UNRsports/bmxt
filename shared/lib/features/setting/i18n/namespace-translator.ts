/**
 * EN: Factory for namespace-scoped translators (tree-shakeable i18n slices).
 * JA: namespace 単位の翻訳関数ファクトリ（Tree-shaking 向け）。
 */

import { DEFAULT_UI_LOCALE, type UiLocale } from "../locale"
import { formatMessage, type MessageVars } from "./format-message"
import type { LocaleMessageEntry } from "./merge-namespace-messages"

export function createNamespaceTranslator<M extends Record<string, LocaleMessageEntry>>(
  messages: M
) {
  type Key = keyof M & string

  function t(key: Key, locale: UiLocale, vars?: MessageVars): string {
    const entry = messages[key]
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

  return { t, messages }
}
