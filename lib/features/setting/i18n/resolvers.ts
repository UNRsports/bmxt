import type { TranslationPairId } from "../../translate/translation-pair"
import { getTranslationPairDef } from "../../translate/translation-pair"
import type { SearchPageActiveMode } from "../../search/page-active-setting"
import type { TabsPageActiveMode } from "../../tabs/page-active-setting"
import type { DomPageActiveMode } from "../../dom/page-active-setting"
import { tDom } from "./ns/dom"
import { BG_IMAGE_MAX_BYTES } from "../appearance"
import type { BgImageImportResult } from "../bg-image-import"
import { pickUiLines, settingTokenForUiLocale, uiBulletPrefix, type BilingualLines, type UiLocale } from "../locale"
import type { UiSettings } from "../settings"
import { tDomList } from "./ns/dom-list"
import { tError } from "./ns/error"
import { tNav, type NavMessageKey } from "./ns/nav"
import { tOptionalHost } from "./ns/optional-host"
import { tSearch } from "./ns/search"
import { tSetting } from "./ns/setting"
import { tTabs } from "./ns/tabs"
import { tTranslate } from "./ns/translate"
import { tVersionUpgrade } from "./ns/version-upgrade"

export type NavStatusMode =
  | "typing"
  | "typingMultiline"
  | "selStart"
  | "selEnd"
  | "copyOpen"
  | "copyClosed"
  | "menu"
  | "jump"
  | "jumpFilter"
  | "idle"

const NAV_STATUS_KEY: Record<NavStatusMode, NavMessageKey> = {
  typing: "nav.status.typing",
  typingMultiline: "nav.status.typingMultiline",
  selStart: "nav.status.selStart",
  selEnd: "nav.status.selEnd",
  copyOpen: "nav.status.copyOpen",
  copyClosed: "nav.status.copyClosed",
  menu: "nav.status.menu",
  jump: "nav.status.jump",
  jumpFilter: "nav.status.jumpFilter",
  idle: "nav.status.idle"
}

export function navActivateErrorLabel(reason: string | null | undefined, locale: UiLocale): string | null {
  if (!reason) {
    return null
  }
  if (reason === "inert") {
    return tNav("nav.activate.error.inert", locale)
  }
  if (reason === "missing") {
    return tNav("nav.activate.error.missing", locale)
  }
  if (reason === "activate-failed") {
    return tNav("nav.activate.error.failed", locale)
  }
  return reason
}

export function navStatusHint(locale: UiLocale, mode: NavStatusMode): string {
  return tNav(NAV_STATUS_KEY[mode], locale)
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
    return tTranslate("translate.status.translating", locale)
  }
  if (navTypingAssist) {
    return tTranslate("translate.status.navTypingAssist", locale)
  }
  return tTranslate("translate.status.assistOn", locale)
}

export function translateStatusHint(
  locale: UiLocale,
  pairId: TranslationPairId,
  navTypingAssist: boolean,
  navTypingMultiline: boolean
): string {
  if (!navTypingAssist) {
    const pairLabel = getTranslationPairDef(pairId).statusLabel
    return tTranslate("translate.status.hintOff", locale, { pairLabel })
  }
  const commitEn = getTranslationPairDef(pairId).commitLanguage === "en"
  const commitHint = tTranslate(
    commitEn ? "translate.status.commitEn" : "translate.status.commitJa",
    locale
  )
  const base = tTranslate("translate.status.hintOnBase", locale, { commitHint })
  return navTypingMultiline
    ? `${base}${tTranslate("translate.status.multilineSuffix", locale)}`
    : base
}

export function tabsStatusHint(locale: UiLocale, pageActiveMode: TabsPageActiveMode): string {
  return tTabs(pageActiveMode === "auto" ? "tabs.status.auto" : "tabs.status.manual", locale)
}

export function searchStatusHint(locale: UiLocale, pageActiveMode: SearchPageActiveMode): string {
  return tSearch(pageActiveMode === "auto" ? "search.status.auto" : "search.status.manual", locale)
}

export function domStatusHint(locale: UiLocale, pageActiveMode: DomPageActiveMode): string {
  return tDom(pageActiveMode === "auto" ? "dom.status.auto" : "dom.status.manual", locale)
}

export function optionalHostDeniedLines(locale: UiLocale): string[] {
  return [
    tOptionalHost("optionalHost.deniedError", locale),
    tOptionalHost("optionalHost.deniedHint", locale)
  ]
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
    tDomList("domList.unavailable", locale),
    tDomList("domList.noTarget", locale),
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
    tDomList("domList.unavailable", locale),
    tDomList("domList.unscriptable", locale),
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
    tDomList("domList.unavailable", locale),
    tDomList("domList.captureFailed", locale),
    `detail: ${detail}`,
    `target: ${title}`,
    `url: ${url}`
  ]
}

export function translateOnLogLine(locale: UiLocale, pairToken: string): string {
  return tTranslate("translate.onLogLine", locale, { pairToken })
}

export function versionUpgradeTitle(locale: UiLocale, version: string): string {
  return tVersionUpgrade("versionUpgrade.title", locale, { version })
}

export function errorLine(locale: UiLocale, message: string): string {
  return tError("error.generic", locale, { message })
}

export function dispatchFailedLine(locale: UiLocale, message: string): string {
  return tError("error.dispatchFailed", locale, { message })
}

export function formatUiSettingsSummaryLines(locale: UiLocale, settings: UiSettings): string[] {
  const { locale: uiLoc, appearance } = settings
  const defaultLabel = tSetting("setting.summary.default", locale)
  const token = settingTokenForUiLocale(uiLoc)
  return [
    tSetting("setting.summary.locale", locale, { token }),
    tSetting("setting.summary.fg", locale, { value: appearance.fg ?? defaultLabel }),
    tSetting("setting.summary.bgColor", locale, { value: appearance.bgColor ?? defaultLabel }),
    tSetting("setting.summary.size", locale, { value: appearance.fontSize ?? defaultLabel }),
    tSetting("setting.summary.font", locale, { value: appearance.fontFamily ?? defaultLabel }),
    tSetting("setting.summary.bgImage", locale, {
      value: appearance.bgImageDataUrl
        ? tSetting("setting.summary.set", locale)
        : tSetting("setting.summary.none", locale)
    })
  ]
}

export function bgImportErrorLine(locale: UiLocale, result: Extract<BgImageImportResult, { ok: false }>): string {
  if (result.errorKey === "setting.error.bgSize" || result.errorKey === "setting.error.bgEncodedSize") {
    return tSetting(result.errorKey, locale, { maxBytes: BG_IMAGE_MAX_BYTES })
  }
  return tSetting(result.errorKey, locale)
}
