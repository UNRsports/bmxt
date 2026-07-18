import type { DispatchMsg } from "../dispatch/effect-types"
import type { MessageVars } from "../setting/i18n/format-message"
import { tCmd, type CmdMessageKey } from "../setting/i18n/ns/cmd"
import { tDom, type DomMessageKey } from "../setting/i18n/ns/dom"
import { tHelp, type HelpMessageKey } from "../setting/i18n/ns/help"
import { tNav, type NavMessageKey } from "../setting/i18n/ns/nav"
import { tSetting, type SettingMessageKey } from "../setting/i18n/ns/setting"
import { tTabs, type TabsMessageKey } from "../setting/i18n/ns/tabs"
import { tTranslate, type TranslateMessageKey } from "../setting/i18n/ns/translate"
import type { UiLocale } from "../setting/locale"

function messageVars(params: DispatchMsg["params"]): MessageVars | undefined {
  if (!params) {
    return undefined
  }
  return params
}

function expandHelpKey(key: HelpMessageKey, locale: UiLocale, vars?: MessageVars): string[] {
  const text = tHelp(key, locale, vars)
  if (key.startsWith("help.section.") || text.includes("\n")) {
    return text.split("\n")
  }
  return [text]
}

/** Expand WASM `msgs` entries to terminal log lines (show_help UiAction is handled elsewhere). */
export function expandDispatchMsg(msg: DispatchMsg, locale: UiLocale): string[] {
  const key = msg.key
  const vars = messageVars(msg.params)

  if (key.startsWith("help.")) {
    return expandHelpKey(key as HelpMessageKey, locale, vars)
  }
  if (key.startsWith("cmd.")) {
    return [tCmd(key as CmdMessageKey, locale, vars)]
  }
  if (key.startsWith("tabs.")) {
    return [tTabs(key as TabsMessageKey, locale, vars)]
  }
  if (key.startsWith("setting.")) {
    return [tSetting(key as SettingMessageKey, locale, vars)]
  }
  if (key.startsWith("nav.")) {
    return [tNav(key as NavMessageKey, locale, vars)]
  }
  if (key.startsWith("dom.")) {
    return [tDom(key as DomMessageKey, locale, vars)]
  }
  if (key.startsWith("translate.")) {
    return [tTranslate(key as TranslateMessageKey, locale, vars)]
  }
  return [key]
}

export function expandDispatchMsgs(msgs: DispatchMsg[], locale: UiLocale): string[] {
  const lines: string[] = []
  for (const msg of msgs) {
    lines.push(...expandDispatchMsg(msg, locale))
  }
  return lines
}
