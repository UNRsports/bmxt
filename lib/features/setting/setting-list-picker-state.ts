import type { UiAppearance } from "./appearance"
import type { UiLocale } from "./locale"
import type { UiSettings } from "./settings"

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
  /** EN: Pending settings shown in preview; committed only on save. */
  draft: UiSettings
}

export const DEFAULT_SETTING_LIST_PICKER_NAV: Pick<
  SettingListPickerState,
  "view" | "editing" | "editDraft"
> = {
  view: "main",
  editing: false,
  editDraft: ""
}

export function createSettingListPickerState(committed: UiSettings): SettingListPickerState {
  return {
    ...DEFAULT_SETTING_LIST_PICKER_NAV,
    draft: {
      locale: committed.locale,
      appearance: { ...committed.appearance }
    }
  }
}

export function settingPickerViewWith(
  prev: SettingListPickerState,
  patch: Partial<SettingListPickerState>
): SettingListPickerState {
  return { ...prev, ...patch }
}

export function settingPickerGoToView(
  view: SettingListPickerView,
  prev: SettingListPickerState
): SettingListPickerState {
  return { ...prev, view, editing: false, editDraft: "" }
}

export function settingPickerUpdateDraft(
  prev: SettingListPickerState,
  patch: { locale?: UiLocale; appearance?: Partial<UiAppearance> }
): SettingListPickerState {
  return {
    ...prev,
    draft: {
      locale: patch.locale ?? prev.draft.locale,
      appearance: patch.appearance
        ? { ...prev.draft.appearance, ...patch.appearance }
        : prev.draft.appearance
    }
  }
}

/** EN: Apply draft patch and return to main list in one state update. */
export function settingPickerApplyDraftToMain(
  prev: SettingListPickerState,
  patch: { locale?: UiLocale; appearance?: Partial<UiAppearance> }
): SettingListPickerState {
  return settingPickerGoToView("main", settingPickerUpdateDraft(prev, patch))
}

export function settingPickerRevertDraft(
  prev: SettingListPickerState,
  committed: UiSettings
): SettingListPickerState {
  return {
    ...prev,
    ...DEFAULT_SETTING_LIST_PICKER_NAV,
    draft: {
      locale: committed.locale,
      appearance: { ...committed.appearance }
    }
  }
}
