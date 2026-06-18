import { t } from "../setting/i18n/messages"
import type { UiLocale } from "../setting/locale"

/** EN: Serializable copy bundle passed into the page overlay (executeScript / content script). */
export type NavOverlayLabels = {
  selectText: string
  saveImage: string
  reloadPage: string
  copySelection: string
  historyBack: string
  historyForward: string
  menuSelectHint: string
  menuCopyHint: string
  textSelStart: string
  textSelEnd: string
  typingLine1: string
  typingLine2: string
  typingMultiline: string
}

export function buildNavOverlayLabels(locale: UiLocale): NavOverlayLabels {
  return {
    selectText: t("nav.overlay.menu.selectText", locale),
    saveImage: t("nav.overlay.menu.saveImage", locale),
    reloadPage: t("nav.overlay.menu.reloadPage", locale),
    copySelection: t("nav.overlay.menu.copySelection", locale),
    historyBack: t("nav.overlay.menu.historyBack", locale),
    historyForward: t("nav.overlay.menu.historyForward", locale),
    menuSelectHint: t("nav.overlay.menu.selectHint", locale),
    menuCopyHint: t("nav.overlay.menu.copyHint", locale),
    textSelStart: t("nav.overlay.textSel.start", locale),
    textSelEnd: t("nav.overlay.textSel.end", locale),
    typingLine1: t("nav.overlay.typing.line1", locale),
    typingLine2: t("nav.overlay.typing.line2", locale),
    typingMultiline: t("nav.overlay.typing.multiline", locale)
  }
}

export function serializeNavOverlayLabels(labels: NavOverlayLabels): string {
  return JSON.stringify(labels)
}

export function parseNavOverlayLabels(raw: string): NavOverlayLabels | null {
  if (!raw.trim()) {
    return null
  }
  try {
    const o = JSON.parse(raw) as Partial<NavOverlayLabels>
    if (
      typeof o.selectText !== "string" ||
      typeof o.saveImage !== "string" ||
      typeof o.reloadPage !== "string" ||
      typeof o.copySelection !== "string"
    ) {
      return null
    }
    return o as NavOverlayLabels
  } catch {
    return null
  }
}

/** EN: English fallback when labels are missing (inject runs outside BMXt React tree). */
export const NAV_OVERLAY_LABELS_FALLBACK: NavOverlayLabels = buildNavOverlayLabels("en")

let cachedLabelsJson = serializeNavOverlayLabels(NAV_OVERLAY_LABELS_FALLBACK)

/** EN: SW / shell bridge — inject pending labels for the next NAV_CONTROL inject. */
export function setNavOverlayLabelsForRun(locale: UiLocale): void {
  cachedLabelsJson = serializeNavOverlayLabels(buildNavOverlayLabels(locale))
}

export function getNavOverlayLabelsJson(): string {
  return cachedLabelsJson
}
