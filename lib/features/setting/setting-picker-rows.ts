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
  | "back"

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
      { id: "bg-clear", line: t("setting.picker.bgClear", locale) },
      { id: "back", line: t("setting.picker.back", locale) }
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
    }
  ]
}

export function settingPickerHeadline(view: SettingListPickerView, locale: UiLocale): string {
  const key: MessageKey =
    view === "main"
      ? "setting.picker.headline.main"
      : view === "language"
        ? "setting.picker.headline.language"
        : view === "fontSize"
          ? "setting.picker.headline.fontSize"
          : "setting.picker.headline.bgImage"
  return t(key, locale)
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
