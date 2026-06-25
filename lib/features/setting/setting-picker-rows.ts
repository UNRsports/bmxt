import {
  DEFAULT_TERMINAL_BG,
  DEFAULT_TERMINAL_FG,
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_FONT_SIZE,
  resolvePickerAppearance,
  resolveSearchHighlightAppearance,
  resolveTerminalAppearance,
  type UiAppearance
} from "./appearance"
import { MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX, parseFontSizePx } from "./validate-size"
import { tSetting, type SettingMessageKey } from "./i18n/ns/setting"
import {
  listUiLocaleSettingTokens,
  settingTokenForUiLocale,
  type UiLocale
} from "./locale"
import type { SettingListPickerView } from "./setting-list-picker-state"
import { isSettingDetailView, isSettingListSubView } from "./setting-picker-nav"
import type { UiSettingsStorageConfig } from "./settings-storage-config"

export type SettingPickerRowId =
  | "language"
  | "edit-picker"
  | "edit-picker-on"
  | "edit-picker-off"
  | "fg"
  | "fg-picker"
  | "bg-color"
  | "bg-color-picker"
  | "search-hit-highlight"
  | "search-jump-highlight"
  | "size"
  | "size-picker"
  | "font"
  | "font-picker"
  | "bg-image"
  | "bg-image-picker"
  | "bg-import"
  | "bg-clear"
  | "reset-default"
  | "reset-search-cache"
  | "storage"
  | "storage-mode-internal"
  | "storage-mode-external"
  | "storage-pick-dir"
  | "storage-reload"
  | "export"
  | "import"
  | "locale-ja"
  | "locale-en"
  | "reset-yes"
  | "reset-no"
  | "search-cache-reset-yes"
  | "search-cache-reset-no"
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
    return `${tSetting("setting.summary.default", locale)} (${resolved})`
  }
  return value
}

export function listFontSizePickerRows(locale: UiLocale): SettingPickerRow[] {
  const rows: SettingPickerRow[] = []
  for (let px = MIN_FONT_SIZE_PX; px <= MAX_FONT_SIZE_PX; px++) {
    const size = `${px}px`
    rows.push({
      id: "size",
      line: tSetting("setting.picker.fontSizeRow", locale, { size })
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

export function fontSizePickerIndexForValue(fontSize: string): number {
  const normalized = parseFontSizePx(fontSize)
  if (normalized === null) {
    return 0
  }
  const px = Number.parseInt(normalized, 10)
  if (!Number.isFinite(px)) {
    return 0
  }
  const index = px - MIN_FONT_SIZE_PX
  if (index < 0) {
    return 0
  }
  const maxIndex = MAX_FONT_SIZE_PX - MIN_FONT_SIZE_PX
  if (index > maxIndex) {
    return maxIndex
  }
  return index
}

/** EN: Highlight index when entering a choice sub-list (current draft value). */
export function settingPickerInitialHi(
  view: SettingListPickerView,
  locale: UiLocale,
  appearance: UiAppearance,
  storageConfig?: UiSettingsStorageConfig
): number {
  if (view === "language") {
    return locale === "en" ? 1 : 0
  }
  if (view === "editPicker") {
    return appearance.editPicker ? 0 : 1
  }
  if (view === "storageMode") {
    return storageConfig?.mode === "external" ? 1 : 0
  }
  const resolvedGlobal = resolveTerminalAppearance(appearance)
  const resolvedPicker = resolvePickerAppearance(appearance)
  if (view === "fontSize") {
    const size = appearance.fontSize ?? resolvedGlobal.fontSize
    return fontSizePickerIndexForValue(size)
  }
  if (view === "pickerFontSize") {
    const size = appearance.picker.fontSize ?? resolvedPicker.fontSize
    return fontSizePickerIndexForValue(size)
  }
  if (view === "bgImage") {
    return appearance.bgImageDataUrl ? 1 : 0
  }
  if (view === "pickerBgImage") {
    return appearance.picker.bgImageDataUrl ? 1 : 0
  }
  if (view === "resetConfirm" || view === "searchCacheResetConfirm") {
    return 1
  }
  return 0
}

function buildGlobalDetailRows(
  view: "fg" | "bgColor" | "font",
  locale: UiLocale,
  appearance: UiAppearance
): SettingPickerRow[] {
  const resolved = resolveTerminalAppearance(appearance)
  if (view === "fg") {
    return [
      {
        id: "fg",
        line: tSetting("setting.picker.detail.fg", locale, {
          value: displayOrDefault(appearance.fg, resolved.fg, locale)
        })
      }
    ]
  }
  if (view === "bgColor") {
    return [
      {
        id: "bg-color",
        line: tSetting("setting.picker.detail.bgColor", locale, {
          value: displayOrDefault(appearance.bgColor, resolved.bgColor, locale)
        })
      }
    ]
  }
  return [
    {
      id: "font",
      line: tSetting("setting.picker.detail.font", locale, {
        value: displayOrDefault(appearance.fontFamily, resolved.fontFamily, locale)
      })
    }
  ]
}

function buildSearchHighlightDetailRows(
  view: "searchHitHighlight" | "searchJumpHighlight",
  locale: UiLocale,
  appearance: UiAppearance
): SettingPickerRow[] {
  const resolved = resolveSearchHighlightAppearance(appearance)
  if (view === "searchHitHighlight") {
    return [
      {
        id: "search-hit-highlight",
        line: tSetting("setting.picker.detail.searchHitHighlight", locale, {
          value: displayOrDefault(appearance.searchHitHighlightBg, resolved.hitBg, locale)
        })
      }
    ]
  }
  return [
    {
      id: "search-jump-highlight",
      line: tSetting("setting.picker.detail.searchJumpHighlight", locale, {
        value: displayOrDefault(appearance.searchJumpHighlightBg, resolved.jumpBg, locale)
      })
    }
  ]
}

function buildPickerDetailRows(
  view: "fgPicker" | "bgColorPicker" | "fontPicker",
  locale: UiLocale,
  appearance: UiAppearance
): SettingPickerRow[] {
  const resolved = resolvePickerAppearance(appearance)
  const layer = appearance.picker
  if (view === "fgPicker") {
    return [
      {
        id: "fg-picker",
        line: tSetting("setting.picker.detail.fgPicker", locale, {
          value: displayOrDefault(layer.fg, resolved.fg, locale)
        })
      }
    ]
  }
  if (view === "bgColorPicker") {
    return [
      {
        id: "bg-color-picker",
        line: tSetting("setting.picker.detail.bgColorPicker", locale, {
          value: displayOrDefault(layer.bgColor, resolved.bgColor, locale)
        })
      }
    ]
  }
  return [
    {
      id: "font-picker",
      line: tSetting("setting.picker.detail.fontPicker", locale, {
        value: displayOrDefault(layer.fontFamily, resolved.fontFamily, locale)
      })
    }
  ]
}

function storageModeSummaryLabel(
  storageConfig: UiSettingsStorageConfig | undefined,
  locale: UiLocale
): string {
  if (storageConfig?.mode === "external") {
    const dir = storageConfig.directoryName
    if (dir) {
      return tSetting("setting.picker.storageModeExternalNamed", locale, { directory: dir })
    }
    return tSetting("setting.picker.storageModeExternal", locale)
  }
  return tSetting("setting.picker.storageModeInternal", locale)
}

export function buildSettingPickerRows(
  view: SettingListPickerView,
  locale: UiLocale,
  appearance: UiAppearance,
  storageConfig?: UiSettingsStorageConfig
): SettingPickerRow[] {
  const resolvedGlobal = resolveTerminalAppearance(appearance)
  const resolvedPicker = resolvePickerAppearance(appearance)
  const resolvedSearchHl = resolveSearchHighlightAppearance(appearance)

  if (view === "language") {
    return listUiLocaleSettingTokens().map((token) => ({
      id: token === "--japanese" ? "locale-ja" : "locale-en",
      line: tSetting("setting.picker.languageRow", locale, { token })
    }))
  }

  if (view === "editPicker") {
    return [
      { id: "edit-picker-on", line: tSetting("setting.picker.editPickerOn", locale) },
      { id: "edit-picker-off", line: tSetting("setting.picker.editPickerOff", locale) }
    ]
  }

  if (view === "storageMode") {
    return [
      {
        id: "storage-mode-internal",
        line: tSetting("setting.picker.storageModeInternalRow", locale)
      },
      {
        id: "storage-mode-external",
        line: tSetting("setting.picker.storageModeExternalRow", locale)
      }
    ]
  }

  if (view === "fontSize" || view === "pickerFontSize") {
    return listFontSizePickerRows(locale)
  }

  if (view === "bgImage" || view === "pickerBgImage") {
    return [
      { id: "bg-import", line: tSetting("setting.picker.bgImport", locale) },
      { id: "bg-clear", line: tSetting("setting.picker.bgClear", locale) }
    ]
  }

  if (view === "fg" || view === "bgColor" || view === "font") {
    return buildGlobalDetailRows(view, locale, appearance)
  }

  if (view === "searchHitHighlight" || view === "searchJumpHighlight") {
    return buildSearchHighlightDetailRows(view, locale, appearance)
  }

  if (view === "fgPicker" || view === "bgColorPicker" || view === "fontPicker") {
    return buildPickerDetailRows(view, locale, appearance)
  }

  if (view === "resetConfirm") {
    return [
      { id: "reset-yes", line: tSetting("setting.picker.resetYes", locale) },
      { id: "reset-no", line: tSetting("setting.picker.resetNo", locale) }
    ]
  }

  if (view === "searchCacheResetConfirm") {
    return [
      {
        id: "search-cache-reset-yes",
        line: tSetting("setting.picker.searchCacheResetYes", locale)
      },
      {
        id: "search-cache-reset-no",
        line: tSetting("setting.picker.searchCacheResetNo", locale)
      }
    ]
  }

  const bgImageLabel = appearance.bgImageDataUrl
    ? tSetting("setting.summary.set", locale)
    : tSetting("setting.summary.none", locale)
  const pickerBgImageLabel = appearance.picker.bgImageDataUrl
    ? tSetting("setting.summary.set", locale)
    : tSetting("setting.summary.none", locale)

  const rows: SettingPickerRow[] = [
    {
      id: "language",
      line: tSetting("setting.picker.main.language", locale, {
        token: settingTokenForUiLocale(locale)
      })
    },
    {
      id: "edit-picker",
      line: tSetting("setting.picker.main.editPicker", locale, {
        value: appearance.editPicker
          ? tSetting("setting.picker.editPickerStateOn", locale)
          : tSetting("setting.picker.editPickerStateOff", locale)
      })
    },
    {
      id: "fg",
      line: tSetting("setting.picker.main.fg", locale, {
        value: displayOrDefault(appearance.fg, resolvedGlobal.fg, locale)
      })
    }
  ]

  if (appearance.editPicker) {
    rows.push({
      id: "fg-picker",
      line: tSetting("setting.picker.main.fgPicker", locale, {
        value: displayOrDefault(appearance.picker.fg, resolvedPicker.fg, locale)
      })
    })
  }

  rows.push({
    id: "bg-color",
    line: tSetting("setting.picker.main.bgColor", locale, {
      value: displayOrDefault(appearance.bgColor, resolvedGlobal.bgColor, locale)
    })
  })

  rows.push({
    id: "search-hit-highlight",
    line: tSetting("setting.picker.main.searchHitHighlight", locale, {
      value: displayOrDefault(appearance.searchHitHighlightBg, resolvedSearchHl.hitBg, locale)
    })
  })

  rows.push({
    id: "search-jump-highlight",
    line: tSetting("setting.picker.main.searchJumpHighlight", locale, {
      value: displayOrDefault(appearance.searchJumpHighlightBg, resolvedSearchHl.jumpBg, locale)
    })
  })

  if (appearance.editPicker) {
    rows.push({
      id: "bg-color-picker",
      line: tSetting("setting.picker.main.bgColorPicker", locale, {
        value: displayOrDefault(appearance.picker.bgColor, resolvedPicker.bgColor, locale)
      })
    })
  }

  rows.push({
    id: "size",
    line: tSetting("setting.picker.main.size", locale, {
      value: displayOrDefault(appearance.fontSize, resolvedGlobal.fontSize, locale)
    })
  })

  if (appearance.editPicker) {
    rows.push({
      id: "size-picker",
      line: tSetting("setting.picker.main.sizePicker", locale, {
        value: displayOrDefault(appearance.picker.fontSize, resolvedPicker.fontSize, locale)
      })
    })
  }

  rows.push({
    id: "font",
    line: tSetting("setting.picker.main.font", locale, {
      value: displayOrDefault(appearance.fontFamily, resolvedGlobal.fontFamily, locale)
    })
  })

  if (appearance.editPicker) {
    rows.push({
      id: "font-picker",
      line: tSetting("setting.picker.main.fontPicker", locale, {
        value: displayOrDefault(appearance.picker.fontFamily, resolvedPicker.fontFamily, locale)
      })
    })
  }

  rows.push({
    id: "bg-image",
    line: tSetting("setting.picker.main.bgImage", locale, { value: bgImageLabel })
  })

  if (appearance.editPicker) {
    rows.push({
      id: "bg-image-picker",
      line: tSetting("setting.picker.main.bgImagePicker", locale, { value: pickerBgImageLabel })
    })
  }

  rows.push({
    id: "storage",
    line: tSetting("setting.picker.main.storage", locale, {
      value: storageModeSummaryLabel(storageConfig, locale)
    })
  })

  if (storageConfig?.mode === "external") {
    rows.push(
      {
        id: "storage-pick-dir",
        line: tSetting("setting.picker.main.storagePickDir", locale)
      },
      {
        id: "storage-reload",
        line: tSetting("setting.picker.main.storageReload", locale)
      }
    )
  }

  rows.push(
    {
      id: "reset-default",
      line: tSetting("setting.picker.main.reset", locale)
    },
    {
      id: "reset-search-cache",
      line: tSetting("setting.picker.main.resetSearchCache", locale)
    },
    {
      id: "export",
      line: tSetting("setting.picker.main.export", locale)
    },
    {
      id: "import",
      line: tSetting("setting.picker.main.import", locale)
    },
    {
      id: "save",
      line: tSetting("setting.picker.main.save", locale)
    },
    {
      id: "cancel",
      line: tSetting("setting.picker.main.cancel", locale)
    }
  )

  return rows
}

export function settingPickerHeadline(
  view: SettingListPickerView,
  locale: UiLocale,
  editing: boolean
): string {
  if (editing && isSettingDetailView(view)) {
    return tSetting("setting.picker.headline.editing", locale)
  }
  const key: SettingMessageKey =
    view === "main"
      ? "setting.picker.headline.main"
      : view === "language"
        ? "setting.picker.headline.language"
        : view === "editPicker"
          ? "setting.picker.headline.editPicker"
          : view === "storageMode"
            ? "setting.picker.headline.storageMode"
            : view === "fontSize"
            ? "setting.picker.headline.fontSize"
            : view === "pickerFontSize"
              ? "setting.picker.headline.pickerFontSize"
              : view === "bgImage"
                ? "setting.picker.headline.bgImage"
                : view === "pickerBgImage"
                  ? "setting.picker.headline.pickerBgImage"
                  : view === "fg"
                    ? "setting.picker.headline.fg"
                    : view === "bgColor"
                      ? "setting.picker.headline.bgColor"
                      : view === "searchHitHighlight"
                        ? "setting.picker.headline.searchHitHighlight"
                        : view === "searchJumpHighlight"
                          ? "setting.picker.headline.searchJumpHighlight"
                          : view === "font"
                        ? "setting.picker.headline.font"
                        : view === "fgPicker"
                          ? "setting.picker.headline.fgPicker"
                          : view === "bgColorPicker"
                            ? "setting.picker.headline.bgColorPicker"
                            : view === "fontPicker"
                              ? "setting.picker.headline.fontPicker"
                              : view === "resetConfirm"
                                ? "setting.picker.headline.resetConfirm"
                                : view === "searchCacheResetConfirm"
                                  ? "setting.picker.headline.searchCacheResetConfirm"
                                  : "setting.picker.headline.main"
  return tSetting(key, locale)
}

export function settingPickerEditAriaLabel(
  view: SettingListPickerView,
  locale: UiLocale
): string {
  if (view === "fg" || view === "fgPicker") {
    return tSetting(view === "fgPicker" ? "setting.picker.editAria.fgPicker" : "setting.picker.editAria.fg", locale)
  }
  if (view === "bgColor" || view === "bgColorPicker") {
    return tSetting(
      view === "bgColorPicker" ? "setting.picker.editAria.bgColorPicker" : "setting.picker.editAria.bgColor",
      locale
    )
  }
  if (view === "searchHitHighlight") {
    return tSetting("setting.picker.editAria.searchHitHighlight", locale)
  }
  if (view === "searchJumpHighlight") {
    return tSetting("setting.picker.editAria.searchJumpHighlight", locale)
  }
  if (view === "font" || view === "fontPicker") {
    return tSetting(
      view === "fontPicker" ? "setting.picker.editAria.fontPicker" : "setting.picker.editAria.font",
      locale
    )
  }
  return tSetting("setting.picker.editAria.generic", locale)
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
