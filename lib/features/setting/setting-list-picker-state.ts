export type SettingListPickerView =
  | "main"
  | "language"
  | "fontSize"
  | "bgImage"
  | "fg"
  | "bgColor"
  | "font"
  | "resetConfirm"

export type SettingListPickerState = {
  view: SettingListPickerView
  /** EN: Inline edit active on fg / bgColor / font detail screens. */
  editing: boolean
  editDraft: string
}

export const DEFAULT_SETTING_LIST_PICKER_STATE: SettingListPickerState = {
  view: "main",
  editing: false,
  editDraft: ""
}

export function settingPickerViewWith(
  prev: SettingListPickerState,
  patch: Partial<SettingListPickerState>
): SettingListPickerState {
  return { ...prev, ...patch }
}

export function settingPickerGoToView(
  view: SettingListPickerView
): SettingListPickerState {
  return { view, editing: false, editDraft: "" }
}
