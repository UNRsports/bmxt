import type { UiLocale } from "../locale"
import { getRunLocale } from "./run-locale"
import { t, type MessageKey } from "./messages"

function L(key: MessageKey, locale?: UiLocale): string {
  return t(key, locale ?? getRunLocale())
}

export function navCmdUsageLines(locale?: UiLocale): string[] {
  return [
    L("cmd.nav.usage.line1", locale),
    L("cmd.nav.usage.line2", locale),
    L("cmd.nav.usage.altToggle", locale),
    L("cmd.nav.usage.navTyping", locale),
    L("cmd.nav.usage.controls", locale)
  ]
}

export function navCmdEnterLines(locale?: UiLocale): string[] {
  return [L("cmd.nav.enter.title", locale), L("cmd.nav.enter.detail", locale)]
}

export function navCmdExitLines(locale?: UiLocale): string[] {
  return [L("cmd.nav.exit.title", locale), L("cmd.nav.exit.detail", locale)]
}

export function settingCmdUsageLines(locale?: UiLocale): string[] {
  return [L("cmd.setting.usage.line1", locale), L("cmd.setting.usage.line2", locale)]
}

export function settingCmdListLines(locale?: UiLocale): string[] {
  return [L("cmd.setting.list.title", locale), L("cmd.setting.list.detail", locale)]
}

export function settingCmdExitLines(locale?: UiLocale): string[] {
  return [L("cmd.setting.exit.title", locale), L("cmd.setting.exit.detail", locale)]
}

export function tabsCmdUsageLines(locale?: UiLocale): string[] {
  return [
    L("cmd.tabs.usage.line1", locale),
    L("cmd.tabs.usage.line2", locale),
    L("cmd.tabs.usage.line3", locale),
    L("cmd.tabs.usage.line4", locale),
    L("cmd.tabs.usage.line5", locale)
  ]
}

export function tabsCmdRunHintLine(locale?: UiLocale): string {
  return L("cmd.tabs.runHint", locale)
}

export function tabsCmdListLines(locale?: UiLocale): string[] {
  return [L("cmd.tabs.list.title", locale), tabsCmdRunHintLine(locale)]
}

export function tabsCmdExitListLines(locale?: UiLocale): string[] {
  return [L("cmd.tabs.exitList.title", locale), tabsCmdRunHintLine(locale)]
}

export function tabsCmdSettingLines(locale?: UiLocale): string[] {
  return [
    L("cmd.tabs.setting.title", locale),
    L("cmd.tabs.setting.pageActive", locale),
    tabsCmdRunHintLine(locale)
  ]
}

export function domCmdUsageLines(locale?: UiLocale): string[] {
  return [
    L("cmd.dom.usage.line1", locale),
    L("cmd.dom.usage.line2", locale),
    L("cmd.dom.usage.listDetail", locale),
    L("cmd.dom.usage.patternDetail", locale)
  ]
}

export function domCmdExitListLines(locale?: UiLocale): string[] {
  return [L("cmd.dom.exitList.title", locale), L("cmd.dom.exitList.detail", locale)]
}

export function searchCmdUsageLines(locale?: UiLocale): string[] {
  return [
    L("cmd.search.usage.line1", locale),
    L("cmd.search.usage.line2", locale),
    L("cmd.search.usage.line3", locale),
    L("cmd.search.usage.pattern", locale),
    L("cmd.search.usage.quotes", locale)
  ]
}

export function searchCmdExitListLines(locale?: UiLocale): string[] {
  return [L("cmd.search.exitList.title", locale), L("cmd.search.exitList.detail", locale)]
}

export function translateCmdUsageLines(locale?: UiLocale): string[] {
  return [
    L("cmd.translate.usage.line1", locale),
    L("cmd.translate.usage.line2", locale),
    L("cmd.translate.usage.line3", locale),
    L("cmd.translate.usage.detail", locale)
  ]
}

export function translateCmdOnLines(locale?: UiLocale): string[] {
  return [L("cmd.translate.on.title", locale), L("cmd.translate.on.detail", locale)]
}

export function translateCmdOffLines(locale?: UiLocale): string[] {
  return [L("cmd.translate.off.title", locale), L("cmd.translate.off.detail", locale)]
}

export function translateCmdSettingLines(locale?: UiLocale): string[] {
  return [L("cmd.translate.setting.title", locale), L("cmd.translate.setting.detail", locale)]
}
