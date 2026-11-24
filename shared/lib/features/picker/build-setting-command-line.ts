/**
 * EN: Build typed `setting` / `sync` lines that the settings picker submits.
 * JA: 設定ピッカーが submit する `setting` / `sync` 行を組み立てる。
 */

import type { SettingEditField } from "../setting/setting-picker-edit.ts"
import type { SettingPickerRowId } from "../setting/setting-picker-rows.ts"
import type { SettingListPickerView } from "../setting/setting-list-picker-state.ts"
import { MAX_FONT_SIZE_PX, MIN_FONT_SIZE_PX } from "../setting/validate-size.ts"

function fontSizeTokenFromPickerIndex(index: number): string | null {
  const px = MIN_FONT_SIZE_PX + index
  if (px < MIN_FONT_SIZE_PX || px > MAX_FONT_SIZE_PX) {
    return null
  }
  return `${px}px`
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:?&=%+#@~-]+$/.test(value)) {
    return value
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** EN: Map a side-effect row id to a one-shot command line (null = navigation-only). */
export function buildSettingPickerRowCommandLine(
  rowId: SettingPickerRowId,
  view: SettingListPickerView,
  index: number
): string | null {
  switch (rowId) {
    case "locale-ja":
      return "setting -set locale ja"
    case "locale-en":
      return "setting -set locale en"
    case "edit-picker-on":
      return "setting -set edit-picker on"
    case "edit-picker-off":
      return "setting -set edit-picker off"
    case "ime-candidate-help-on":
      return "setting -set ime-candidate-help on"
    case "ime-candidate-help-off":
      return "setting -set ime-candidate-help off"
    case "prompt-fire-on":
      return "setting -set prompt-fire on"
    case "prompt-fire-off":
      return "setting -set prompt-fire off"
    case "search-legend-text":
      return "setting -set search-legend text"
    case "search-legend-emoji":
      return "setting -set search-legend emoji"
    case "search-legend-text-emoji":
      return "setting -set search-legend text_emoji"
    case "host-ui-auto":
      return "setting -set host-ui auto"
    case "host-ui-desktop":
      return "setting -set host-ui desktop"
    case "host-ui-mobile":
      return "setting -set host-ui mobile"
    case "reset-yes":
      return "setting -reset-default"
    case "reset-no":
      return null
    case "size": {
      if (view !== "fontSize" && view !== "pickerFontSize") {
        return null
      }
      const fontSize = fontSizeTokenFromPickerIndex(index)
      if (fontSize === null) {
        return null
      }
      const key = view === "pickerFontSize" ? "picker-size" : "size"
      return `setting -set ${key} ${fontSize}`
    }
    case "bg-import":
      return view === "pickerBgImage" ? "setting -bg-import --picker" : "setting -bg-import"
    case "bg-clear":
      return view === "pickerBgImage"
        ? "setting -set picker-bg-image default"
        : "setting -set bg-image default"
    case "storage-mode-internal":
      return "setting -storage internal"
    case "storage-mode-external":
      return "setting -storage external"
    case "storage-pick-dir":
      return "setting -pick-dir"
    case "storage-reload":
      return "setting -reload"
    case "snapshot-storage-bundled":
      return "setting -snapshot-storage bundled"
    case "snapshot-storage-vault":
      return "setting -snapshot-storage vault"
    case "snapshot-vault-pick-dir":
      return "setting -snapshot-pick-dir"
    case "sync-setup-guide":
      return "setting -sync-guide"
    case "export":
      return "setting -export"
    case "import":
      return "setting -import"
    default:
      return null
  }
}

/** EN: Inline edit fields → `setting -set` / `sync -setname`. */
export function buildSettingEditCommandLine(
  field: SettingEditField,
  value: string
): string | null {
  if (field === "sync-display-name") {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }
    return `sync -setname ${shellQuote(trimmed)}`
  }
  const key =
    field === "fg"
      ? "fg"
      : field === "picker-fg"
        ? "picker-fg"
        : field === "bg-color"
          ? "bg-color"
          : field === "picker-bg-color"
            ? "picker-bg-color"
            : field === "search-hit-highlight"
              ? "search-hit-highlight"
              : field === "search-jump-highlight"
                ? "search-jump-highlight"
                : field === "picker-font"
                  ? "picker-font"
                  : "font"
  return `setting -set ${key} ${shellQuote(value.trim())}`
}
