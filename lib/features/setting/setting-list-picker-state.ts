export type SettingListPickerView = "main" | "language" | "fontSize" | "bgImage"

export type SettingListPickerState = {
  view: SettingListPickerView
}

export const DEFAULT_SETTING_LIST_PICKER_STATE: SettingListPickerState = {
  view: "main"
}
