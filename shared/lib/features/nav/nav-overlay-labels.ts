import { tNav } from "../setting/i18n/ns/nav"
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
    selectText: tNav("nav.overlay.menu.selectText", locale),
    saveImage: tNav("nav.overlay.menu.saveImage", locale),
    reloadPage: tNav("nav.overlay.menu.reloadPage", locale),
    copySelection: tNav("nav.overlay.menu.copySelection", locale),
    historyBack: tNav("nav.overlay.menu.historyBack", locale),
    historyForward: tNav("nav.overlay.menu.historyForward", locale),
    menuSelectHint: tNav("nav.overlay.menu.selectHint", locale),
    menuCopyHint: tNav("nav.overlay.menu.copyHint", locale),
    textSelStart: tNav("nav.overlay.textSel.start", locale),
    textSelEnd: tNav("nav.overlay.textSel.end", locale),
    typingLine1: tNav("nav.overlay.typing.line1", locale),
    typingLine2: tNav("nav.overlay.typing.line2", locale),
    typingMultiline: tNav("nav.overlay.typing.multiline", locale)
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

/** EN: Japanese fallback when labels are missing (inject runs outside BMXt React tree). */
export const NAV_OVERLAY_LABELS_FALLBACK: NavOverlayLabels = buildNavOverlayLabels("ja")

let cachedLabelsJson = serializeNavOverlayLabels(NAV_OVERLAY_LABELS_FALLBACK)

/** EN: SW / shell bridge — inject pending labels for the next NAV_CONTROL inject. */
export function setNavOverlayLabelsForRun(locale: UiLocale): void {
  cachedLabelsJson = serializeNavOverlayLabels(buildNavOverlayLabels(locale))
}

export function getNavOverlayLabelsJson(): string {
  return cachedLabelsJson
}
