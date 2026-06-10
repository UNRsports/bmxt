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

export type SettingEditField =
  | "fg"
  | "bg-color"
  | "font"
  | "picker-fg"
  | "picker-bg-color"
  | "picker-font"

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
  const layer = isSettingPickerDetailView(state.view) ? "picker" : "global"
  return mergeLayerEdit(appearance, layer, field, state.editDraft)
}

export function validateSettingEditValue(field: SettingEditField, raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (field === "fg" || field === "bg-color" || field === "picker-fg" || field === "picker-bg-color") {
    return parseHexColor(trimmed)
  }
  return parseFontFamily(trimmed)
}

export function settingEditFieldForView(
  view: SettingListPickerState["view"]
): SettingEditField {
  if (view === "fg" || view === "fgPicker") {
    return view === "fgPicker" ? "picker-fg" : "fg"
  }
  if (view === "bgColor" || view === "bgColorPicker") {
    return view === "bgColorPicker" ? "picker-bg-color" : "bg-color"
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
