import type { UiAppearance, UiAppearanceLayer } from "./appearance"
import type { UiLocale } from "./locale"
import type { UiSettings } from "./settings"

export type SettingListPickerView =
  | "main"
  | "language"
  | "editPicker"
  | "fontSize"
  | "pickerFontSize"
  | "bgImage"
  | "pickerBgImage"
  | "fg"
  | "bgColor"
  | "searchHitHighlight"
  | "searchJumpHighlight"
  | "font"
  | "fgPicker"
  | "bgColorPicker"
  | "fontPicker"
  | "resetConfirm"
  | "searchCacheResetConfirm"
  | "storageMode"

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

export type SettingDraftPatch = {
  locale?: UiLocale
  editPicker?: boolean
  appearance?: Partial<UiAppearanceLayer>
  picker?: Partial<UiAppearanceLayer>
}

export function createSettingListPickerState(committed: UiSettings): SettingListPickerState {
  return {
    ...DEFAULT_SETTING_LIST_PICKER_NAV,
    draft: {
      locale: committed.locale,
      appearance: { ...committed.appearance, picker: { ...committed.appearance.picker } }
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

function applyDraftPatch(
  prev: SettingListPickerState,
  patch: SettingDraftPatch
): SettingListPickerState["draft"] {
  let draft = prev.draft
  if (patch.locale !== undefined) {
    draft = { ...draft, locale: patch.locale }
  }
  const nextAppearance = { ...draft.appearance, picker: { ...draft.appearance.picker } }
  if (patch.editPicker !== undefined) {
    nextAppearance.editPicker = patch.editPicker
  }
  if (patch.appearance) {
    Object.assign(nextAppearance, patch.appearance)
  }
  if (patch.picker) {
    nextAppearance.picker = { ...nextAppearance.picker, ...patch.picker }
  }
  return { ...draft, appearance: nextAppearance }
}

export function settingPickerUpdateDraft(
  prev: SettingListPickerState,
  patch: SettingDraftPatch
): SettingListPickerState {
  return {
    ...prev,
    draft: applyDraftPatch(prev, patch)
  }
}

/** EN: Apply draft patch and return to main list in one state update. */
export function settingPickerApplyDraftToMain(
  prev: SettingListPickerState,
  patch: SettingDraftPatch
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
      appearance: { ...committed.appearance, picker: { ...committed.appearance.picker } }
    }
  }
}
