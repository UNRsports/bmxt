import type { UiAppearance } from "./appearance"
import { parseHexColor, previewHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"
import type { SettingListPickerState } from "./setting-list-picker-state"

export type SettingEditField = "fg" | "bg-color" | "font"

/** EN: Merge in-progress editDraft into draft appearance for the preview panel. */
export function resolveSettingPickerPreviewAppearance(
  state: SettingListPickerState
): UiAppearance {
  const appearance = state.draft.appearance
  const editingDetail =
    state.editing &&
    (state.view === "fg" || state.view === "bgColor" || state.view === "font")
  if (!editingDetail) {
    return appearance
  }
  const raw = state.editDraft
  if (state.view === "fg") {
    const fg = previewHexColor(raw)
    return fg !== null ? { ...appearance, fg } : appearance
  }
  if (state.view === "bgColor") {
    const bgColor = previewHexColor(raw)
    return bgColor !== null ? { ...appearance, bgColor } : appearance
  }
  const fontFamily = validateSettingEditValue("font", raw)
  return fontFamily !== null ? { ...appearance, fontFamily } : appearance
}

export function validateSettingEditValue(field: SettingEditField, raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (field === "fg" || field === "bg-color") {
    return parseHexColor(trimmed)
  }
  return parseFontFamily(trimmed)
}

export function settingEditFieldForView(
  view: "fg" | "bgColor" | "font"
): SettingEditField {
  if (view === "fg") {
    return "fg"
  }
  if (view === "bgColor") {
    return "bg-color"
  }
  return "font"
}
