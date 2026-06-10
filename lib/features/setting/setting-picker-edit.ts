import { parseHexColor } from "./validate-color"
import { parseFontFamily } from "./validate-font"

export type SettingEditField = "fg" | "bg-color" | "font"

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
