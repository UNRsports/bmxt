import type { UiAppearance, UiAppearanceLayer } from "./appearance"
import { DEFAULT_HOST_UI_MODE, type HostUiMode } from "./host-ui-mode.ts"
import type { UiLocale } from "./locale"
import {
  DEFAULT_SEARCH_LEGEND_MODE,
  normalizeSearchLegendMode,
  type SearchLegendMode
} from "./search-legend-mode.ts"
import type { UiSettings } from "./settings"

export type SettingListPickerView =
  | "main"
  | "language"
  | "editPicker"
  | "imeCandidateHelp"
  | "promptFire"
  | "searchLegend"
  | "hostUi"
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
  | "storageMode"
  | "snapshotStorageMode"
  | "syncPanel"
  | "syncDeviceName"

export type SettingListPickerState = {
  view: SettingListPickerView
  /** EN: Inline edit active on fg / bgColor / font detail screens. */
  editing: boolean
  editDraft: string
  /**
   * EN: Mirror of committed UI settings while the picker column is open.
   *     Edits commit immediately; this field stays in sync after each write.
   */
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

export type SettingAppearancePatch = Partial<UiAppearanceLayer> & {
  searchHitHighlightBg?: string | null
  searchJumpHighlightBg?: string | null
}

export type SettingDraftPatch = {
  locale?: UiLocale
  editPicker?: boolean
  imeCandidateHelp?: boolean
  promptFire?: boolean
  searchLegendMode?: SearchLegendMode
  hostUiMode?: HostUiMode
  appearance?: SettingAppearancePatch
  picker?: Partial<UiAppearanceLayer>
}

export function createSettingListPickerState(committed: UiSettings): SettingListPickerState {
  return {
    ...DEFAULT_SETTING_LIST_PICKER_NAV,
    draft: {
      locale: committed.locale,
      hostUiMode: committed.hostUiMode ?? DEFAULT_HOST_UI_MODE,
      imeCandidateHelp: committed.imeCandidateHelp !== false,
      promptFire: committed.promptFire === true,
      searchLegendMode: normalizeSearchLegendMode(
        committed.searchLegendMode ?? DEFAULT_SEARCH_LEGEND_MODE
      ),
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

/** EN: Apply a closed setting patch onto a `UiSettings` value (pure). */
export function applySettingDraftPatchToSettings(
  prev: UiSettings,
  patch: SettingDraftPatch
): UiSettings {
  let next = prev
  if (patch.locale !== undefined) {
    next = { ...next, locale: patch.locale }
  }
  if (patch.hostUiMode !== undefined) {
    next = { ...next, hostUiMode: patch.hostUiMode }
  }
  if (patch.imeCandidateHelp !== undefined) {
    next = { ...next, imeCandidateHelp: patch.imeCandidateHelp }
  }
  if (patch.promptFire !== undefined) {
    next = { ...next, promptFire: patch.promptFire }
  }
  if (patch.searchLegendMode !== undefined) {
    next = {
      ...next,
      searchLegendMode: normalizeSearchLegendMode(patch.searchLegendMode)
    }
  }
  const nextAppearance: UiAppearance = {
    ...next.appearance,
    picker: { ...next.appearance.picker }
  }
  if (patch.editPicker !== undefined) {
    nextAppearance.editPicker = patch.editPicker
  }
  if (patch.appearance) {
    const { searchHitHighlightBg, searchJumpHighlightBg, ...layer } = patch.appearance
    Object.assign(nextAppearance, layer)
    if (searchHitHighlightBg !== undefined) {
      nextAppearance.searchHitHighlightBg = searchHitHighlightBg
    }
    if (searchJumpHighlightBg !== undefined) {
      nextAppearance.searchJumpHighlightBg = searchJumpHighlightBg
    }
  }
  if (patch.picker) {
    nextAppearance.picker = { ...nextAppearance.picker, ...patch.picker }
  }
  return { ...next, appearance: nextAppearance }
}

export function settingPickerUpdateDraft(
  prev: SettingListPickerState,
  patch: SettingDraftPatch
): SettingListPickerState {
  return {
    ...prev,
    draft: applySettingDraftPatchToSettings(prev.draft, patch)
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
      hostUiMode: committed.hostUiMode ?? DEFAULT_HOST_UI_MODE,
      imeCandidateHelp: committed.imeCandidateHelp !== false,
      promptFire: committed.promptFire === true,
      searchLegendMode: normalizeSearchLegendMode(
        committed.searchLegendMode ?? DEFAULT_SEARCH_LEGEND_MODE
      ),
      appearance: { ...committed.appearance, picker: { ...committed.appearance.picker } }
    }
  }
}
