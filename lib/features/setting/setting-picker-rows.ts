import {
  DEFAULT_TERMINAL_BG,
  DEFAULT_TERMINAL_FG,
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_FONT_SIZE,
  resolveTerminalAppearance,
  type UiAppearance
} from "./appearance"
import { MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX } from "./validate-size"
import { t, type MessageKey } from "./i18n/messages"
import {
  listUiLocaleSettingTokens,
  settingTokenForUiLocale,
  type UiLocale
} from "./locale"
import type { SettingListPickerView } from "./setting-list-picker-state"
import { isSettingDetailView, isSettingListSubView } from "./setting-picker-nav"

export type SettingPickerRowId =
  | "language"
  | "fg"
  | "bg-color"
  | "size"
  | "font"
  | "bg-image"
  | "bg-import"
  | "bg-clear"
  | "reset-default"
  | "export"
  | "import"
  | "locale-ja"
  | "locale-en"
  | "reset-yes"
  | "reset-no"
  | "save"
  | "cancel"

export type SettingPickerRow = {
  id: SettingPickerRowId
  line: string
}

function displayOrDefault(
  value: string | null,
  resolved: string,
  locale: UiLocale
): string {
  if (value === null) {
    return `${t("setting.summary.default", locale)} (${resolved})`
  }
  return value
}

export function listFontSizePickerRows(locale: UiLocale): SettingPickerRow[] {
  const rows: SettingPickerRow[] = []
  for (let px = MIN_FONT_SIZE_PX; px <= MAX_FONT_SIZE_PX; px++) {
    const size = `${px}px`
    rows.push({
      id: "size",
      line: t("setting.picker.fontSizeRow", locale, { size })
    })
  }
  return rows
}

export function fontSizeFromPickerIndex(index: number): string | null {
  const px = MIN_FONT_SIZE_PX + index
  if (px < MIN_FONT_SIZE_PX || px > MAX_FONT_SIZE_PX) {
    return null
  }
  return `${px}px`
}

export function buildSettingPickerRows(
  view: SettingListPickerView,
  locale: UiLocale,
  appearance: UiAppearance
): SettingPickerRow[] {
  const resolved = resolveTerminalAppearance(appearance)

  if (view === "language") {
    return listUiLocaleSettingTokens().map((token) => ({
      id: token === "--japanese" ? "locale-ja" : "locale-en",
      line: t("setting.picker.languageRow", locale, { token })
    }))
  }

  if (view === "fontSize") {
    return listFontSizePickerRows(locale)
  }

  if (view === "bgImage") {
    return [
      { id: "bg-import", line: t("setting.picker.bgImport", locale) },
      { id: "bg-clear", line: t("setting.picker.bgClear", locale) }
    ]
  }

  if (view === "fg") {
    return [
      {
        id: "fg",
        line: t("setting.picker.detail.fg", locale, {
          value: displayOrDefault(appearance.fg, resolved.fg, locale)
        })
      }
    ]
  }

  if (view === "bgColor") {
    return [
      {
        id: "bg-color",
        line: t("setting.picker.detail.bgColor", locale, {
          value: displayOrDefault(appearance.bgColor, resolved.bgColor, locale)
        })
      }
    ]
  }

  if (view === "font") {
    return [
      {
        id: "font",
        line: t("setting.picker.detail.font", locale, {
          value: displayOrDefault(appearance.fontFamily, resolved.fontFamily, locale)
        })
      }
    ]
  }

  if (view === "resetConfirm") {
    return [
      { id: "reset-yes", line: t("setting.picker.resetYes", locale) },
      { id: "reset-no", line: t("setting.picker.resetNo", locale) }
    ]
  }

  const bgImageLabel = appearance.bgImageDataUrl
    ? t("setting.summary.set", locale)
    : t("setting.summary.none", locale)

  return [
    {
      id: "language",
      line: t("setting.picker.main.language", locale, {
        token: settingTokenForUiLocale(locale)
      })
    },
    {
      id: "fg",
      line: t("setting.picker.main.fg", locale, {
        value: displayOrDefault(appearance.fg, resolved.fg, locale)
      })
    },
    {
      id: "bg-color",
      line: t("setting.picker.main.bgColor", locale, {
        value: displayOrDefault(appearance.bgColor, resolved.bgColor, locale)
      })
    },
    {
      id: "size",
      line: t("setting.picker.main.size", locale, {
        value: displayOrDefault(appearance.fontSize, resolved.fontSize, locale)
      })
    },
    {
      id: "font",
      line: t("setting.picker.main.font", locale, {
        value: displayOrDefault(appearance.fontFamily, resolved.fontFamily, locale)
      })
    },
    {
      id: "bg-image",
      line: t("setting.picker.main.bgImage", locale, { value: bgImageLabel })
    },
    {
      id: "reset-default",
      line: t("setting.picker.main.reset", locale)
    },
    {
      id: "export",
      line: t("setting.picker.main.export", locale)
    },
    {
      id: "import",
      line: t("setting.picker.main.import", locale)
    },
    {
      id: "save",
      line: t("setting.picker.main.save", locale)
    },
    {
      id: "cancel",
      line: t("setting.picker.main.cancel", locale)
    }
  ]
}

export function settingPickerHeadline(
  view: SettingListPickerView,
  locale: UiLocale,
  editing: boolean
): string {
  if (editing && isSettingDetailView(view)) {
    return t("setting.picker.headline.editing", locale)
  }
  const key: MessageKey =
    view === "main"
      ? "setting.picker.headline.main"
      : view === "language"
        ? "setting.picker.headline.language"
        : view === "fontSize"
          ? "setting.picker.headline.fontSize"
          : view === "bgImage"
            ? "setting.picker.headline.bgImage"
            : view === "fg"
              ? "setting.picker.headline.fg"
              : view === "bgColor"
                ? "setting.picker.headline.bgColor"
                : view === "font"
                  ? "setting.picker.headline.font"
                  : view === "resetConfirm"
                    ? "setting.picker.headline.resetConfirm"
                    : "setting.picker.headline.main"
  return t(key, locale)
}

export function settingPickerEditAriaLabel(
  view: SettingListPickerView,
  locale: UiLocale
): string {
  if (view === "fg") {
    return t("setting.picker.editAria.fg", locale)
  }
  if (view === "bgColor") {
    return t("setting.picker.editAria.bgColor", locale)
  }
  if (view === "font") {
    return t("setting.picker.editAria.font", locale)
  }
  return t("setting.picker.editAria.generic", locale)
}

export function settingPickerAllowsVerticalNav(view: SettingListPickerView): boolean {
  return view === "main" || isSettingListSubView(view)
}

export function resolvedDefaultFg(): string {
  return DEFAULT_TERMINAL_FG
}

export function resolvedDefaultBg(): string {
  return DEFAULT_TERMINAL_BG
}

export function resolvedDefaultFontSize(): string {
  return DEFAULT_TERMINAL_FONT_SIZE
}

export function resolvedDefaultFontFamily(): string {
  return DEFAULT_TERMINAL_FONT_FAMILY
}
