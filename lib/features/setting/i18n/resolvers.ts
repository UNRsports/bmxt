import type { TranslationPairId } from "../../translate/translation-pair"
import { getTranslationPairDef } from "../../translate/translation-pair"
import type { TabsPageActiveMode } from "../../tabs/page-active-setting"
import { BG_IMAGE_MAX_BYTES } from "../appearance"
import type { BgImageImportResult } from "../bg-image-import"
import { pickUiLines, settingTokenForUiLocale, uiBulletPrefix, type BilingualLines, type UiLocale } from "../locale"
import type { UiSettings } from "../settings"
import { t, type MessageKey } from "./messages"

export type NavStatusMode =
  | "typing"
  | "typingMultiline"
  | "selStart"
  | "selEnd"
  | "copyOpen"
  | "copyClosed"
  | "menu"
  | "idle"

const NAV_STATUS_KEY: Record<NavStatusMode, MessageKey> = {
  typing: "nav.status.typing",
  typingMultiline: "nav.status.typingMultiline",
  selStart: "nav.status.selStart",
  selEnd: "nav.status.selEnd",
  copyOpen: "nav.status.copyOpen",
  copyClosed: "nav.status.copyClosed",
  menu: "nav.status.menu",
  idle: "nav.status.idle"
}

export function navStatusHint(locale: UiLocale, mode: NavStatusMode): string {
  return t(NAV_STATUS_KEY[mode], locale)
}

export function translateStatusMeta(
  locale: UiLocale,
  busy: boolean,
  navTypingAssist: boolean,
  statusNote: string | null
): string {
  if (statusNote !== null && statusNote.length > 0) {
    return statusNote
  }
  if (busy) {
    return t("translate.status.translating", locale)
  }
  if (navTypingAssist) {
    return t("translate.status.navTypingAssist", locale)
  }
  return t("translate.status.assistOn", locale)
}

export function translateStatusHint(
  locale: UiLocale,
  pairId: TranslationPairId,
  navTypingAssist: boolean,
  navTypingMultiline: boolean
): string {
  if (!navTypingAssist) {
    const pairLabel = getTranslationPairDef(pairId).statusLabel
    return t("translate.status.hintOff", locale, { pairLabel })
  }
  const commitEn = getTranslationPairDef(pairId).commitLanguage === "en"
  const commitHint = t(
    commitEn ? "translate.status.commitEn" : "translate.status.commitJa",
    locale
  )
  const base = t("translate.status.hintOnBase", locale, { commitHint })
  return navTypingMultiline ? `${base}${t("translate.status.multilineSuffix", locale)}` : base
}

export function tabsStatusHint(locale: UiLocale, pageActiveMode: TabsPageActiveMode): string {
  return t(pageActiveMode === "auto" ? "tabs.status.auto" : "tabs.status.manual", locale)
}

export function searchStatusHint(locale: UiLocale): string {
  return t("search.status.hint", locale)
}

export function optionalHostDeniedLines(locale: UiLocale): string[] {
  return [t("optionalHost.deniedError", locale), t("optionalHost.deniedHint", locale)]
}

export function formatBulletedLines(entry: BilingualLines, locale: UiLocale): string[] {
  const prefix = uiBulletPrefix(locale)
  return pickUiLines(entry, locale).map((line) => `${prefix}${line}`)
}

export function domListNoTargetLines(
  locale: UiLocale,
  title: string,
  url: string
): string[] {
  return [
    t("domList.unavailable", locale),
    t("domList.noTarget", locale),
    `target: ${title}`,
    `url: ${url}`
  ]
}

export function domListUnscriptableLines(
  locale: UiLocale,
  title: string,
  url: string,
  reason?: string
): string[] {
  const lines = [
    t("domList.unavailable", locale),
    t("domList.unscriptable", locale),
    `target: ${title}`,
    `url: ${url}`
  ]
  if (reason) {
    lines.push(`detail: ${reason}`)
  }
  return lines
}

export function domListCaptureFailedLines(
  locale: UiLocale,
  title: string,
  url: string,
  detail: string
): string[] {
  return [
    t("domList.unavailable", locale),
    t("domList.captureFailed", locale),
    `detail: ${detail}`,
    `target: ${title}`,
    `url: ${url}`
  ]
}

export function translateOnLogLine(locale: UiLocale, pairToken: string): string {
  return t("translate.onLogLine", locale, { pairToken })
}

export function versionUpgradeTitle(locale: UiLocale, version: string): string {
  return t("versionUpgrade.title", locale, { version })
}

export function errorLine(locale: UiLocale, message: string): string {
  return t("error.generic", locale, { message })
}

export function dispatchFailedLine(locale: UiLocale, message: string): string {
  return t("error.dispatchFailed", locale, { message })
}

export function formatUiSettingsSummaryLines(locale: UiLocale, settings: UiSettings): string[] {
  const { locale: uiLoc, appearance } = settings
  const defaultLabel = t("setting.summary.default", locale)
  const token = settingTokenForUiLocale(uiLoc)
  return [
    t("setting.summary.locale", locale, { token }),
    t("setting.summary.fg", locale, { value: appearance.fg ?? defaultLabel }),
    t("setting.summary.bgColor", locale, { value: appearance.bgColor ?? defaultLabel }),
    t("setting.summary.size", locale, { value: appearance.fontSize ?? defaultLabel }),
    t("setting.summary.font", locale, { value: appearance.fontFamily ?? defaultLabel }),
    t("setting.summary.bgImage", locale, {
      value: appearance.bgImageDataUrl
        ? t("setting.summary.set", locale)
        : t("setting.summary.none", locale)
    })
  ]
}

export function bgImportErrorLine(locale: UiLocale, result: Extract<BgImageImportResult, { ok: false }>): string {
  if (result.errorKey === "setting.error.bgSize" || result.errorKey === "setting.error.bgEncodedSize") {
    return t(result.errorKey, locale, { maxBytes: BG_IMAGE_MAX_BYTES })
  }
  return t(result.errorKey, locale)
}
