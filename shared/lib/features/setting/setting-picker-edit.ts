import {
  DEFAULT_UI_APPEARANCE_LAYER,
  normalizeUiAppearance,
  type UiAppearance
} from "./appearance"
import { parseHexColor, previewHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"
import type { SettingListPickerState } from "./setting-list-picker-state"
import {
  isSettingDetailView,
  isSettingPickerDetailView
} from "./setting-picker-nav"
import { sanitizeDisplayName } from "../sync/device/device-identity.ts"

export type SettingEditField =
  | "fg"
  | "bg-color"
  | "search-hit-highlight"
  | "search-jump-highlight"
  | "font"
  | "picker-fg"
  | "picker-bg-color"
  | "picker-font"
  | "sync-display-name"
  | "sync-answer-code"
  | "sync-accept-code"

function mergeLayerEdit(
  appearance: UiAppearance,
  layer: "global" | "picker",
  field: SettingEditField,
  raw: string
): UiAppearance {
  const trimmed = raw.trim()
  if (field === "fg" || field === "picker-fg") {
    const fg = previewHexColor(trimmed)
    if (fg === null) {
      return appearance
    }
    if (layer === "picker") {
      return normalizeUiAppearance({
        ...appearance,
        picker: { ...appearance.picker, fg }
      })
    }
    return normalizeUiAppearance({ ...appearance, fg })
  }
  if (field === "bg-color" || field === "picker-bg-color") {
    const bgColor = previewHexColor(trimmed)
    if (bgColor === null) {
      return appearance
    }
    if (layer === "picker") {
      return normalizeUiAppearance({
        ...appearance,
        picker: { ...appearance.picker, bgColor }
      })
    }
    return normalizeUiAppearance({ ...appearance, bgColor })
  }
  if (field === "search-hit-highlight") {
    const searchHitHighlightBg = previewHexColor(trimmed)
    if (searchHitHighlightBg === null) {
      return appearance
    }
    return normalizeUiAppearance({ ...appearance, searchHitHighlightBg })
  }
  if (field === "search-jump-highlight") {
    const searchJumpHighlightBg = previewHexColor(trimmed)
    if (searchJumpHighlightBg === null) {
      return appearance
    }
    return normalizeUiAppearance({ ...appearance, searchJumpHighlightBg })
  }
  const fontFamily = validateSettingEditValue(
    layer === "picker" ? "picker-font" : "font",
    trimmed
  )
  if (fontFamily === null) {
    return appearance
  }
  if (layer === "picker") {
    return normalizeUiAppearance({
      ...appearance,
      picker: { ...appearance.picker, fontFamily }
    })
  }
  return normalizeUiAppearance({ ...appearance, fontFamily })
}

/** EN: Merge in-progress editDraft into draft appearance for the preview panel. */
export function resolveSettingPickerPreviewAppearance(
  state: SettingListPickerState
): UiAppearance {
  const appearance = state.draft.appearance
  if (!state.editing || !isSettingDetailView(state.view)) {
    return appearance
  }
  const field = settingEditFieldForView(state.view)
  if (
    field === "sync-display-name" ||
    field === "sync-answer-code" ||
    field === "sync-accept-code"
  ) {
    return appearance
  }
  const layer = isSettingPickerDetailView(state.view) ? "picker" : "global"
  return mergeLayerEdit(appearance, layer, field, state.editDraft)
}

export function validateSettingEditValue(field: SettingEditField, raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (field === "sync-display-name") {
    return sanitizeDisplayName(trimmed)
  }
  if (field === "sync-answer-code" || field === "sync-accept-code") {
    if (trimmed.length < 16 || trimmed.length > 48_000) {
      return null
    }
    if (!trimmed.startsWith("bmxt-rtc1.")) {
      return null
    }
    return trimmed
  }
  if (field === "fg" || field === "bg-color" || field === "picker-fg" || field === "picker-bg-color") {
    return parseHexColor(trimmed)
  }
  if (field === "search-hit-highlight" || field === "search-jump-highlight") {
    return parseHexColor(trimmed)
  }
  return parseFontFamily(trimmed)
}

export function settingEditFieldForView(
  view: SettingListPickerState["view"]
): SettingEditField {
  if (view === "syncDeviceName") {
    return "sync-display-name"
  }
  if (view === "syncAnswerCode") {
    return "sync-answer-code"
  }
  if (view === "syncAcceptCode") {
    return "sync-accept-code"
  }
  if (view === "fg" || view === "fgPicker") {
    return view === "fgPicker" ? "picker-fg" : "fg"
  }
  if (view === "bgColor" || view === "bgColorPicker") {
    return view === "bgColorPicker" ? "picker-bg-color" : "bg-color"
  }
  if (view === "searchHitHighlight") {
    return "search-hit-highlight"
  }
  if (view === "searchJumpHighlight") {
    return "search-jump-highlight"
  }
  return view === "fontPicker" ? "picker-font" : "font"
}

export function settingEditLayerForView(
  view: SettingListPickerState["view"]
): "global" | "picker" {
  return isSettingPickerDetailView(view) ? "picker" : "global"
}

export function appearanceLayerForEdit(
  appearance: UiAppearance,
  layer: "global" | "picker"
): typeof DEFAULT_UI_APPEARANCE_LAYER {
  if (layer === "picker") {
    return appearance.picker
  }
  return appearance
}
