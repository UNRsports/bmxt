import type { UiLocale } from "./locale"
import type { SettingListPickerState } from "./setting-list-picker-state"
import type { UiSettings } from "./settings"

/** EN: Locale for command output — setting picker draft wins until save & exit. */
export function effectiveCommandLocale(
  uiSettings: UiSettings,
  settingListPicker: SettingListPickerState | null | undefined
): UiLocale {
  if (settingListPicker !== null && settingListPicker !== undefined) {
    return settingListPicker.draft.locale
  }
  return uiSettings.locale
}
