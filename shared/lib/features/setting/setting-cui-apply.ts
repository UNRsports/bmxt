import {
  createSettingListPickerState,
  settingPickerApplyDraftToMain,
  settingPickerUpdateDraft,
  type SettingListPickerState
} from "./setting-list-picker-state.ts"
import { replaceUiSettings, type UiSettings } from "./settings.ts"
import { settingSetPatchFromArgs } from "./setting-set-args.ts"
import type { UiLocale } from "./locale.ts"

export { settingSetPatchFromArgs } from "./setting-set-args.ts"

export type SettingCuiApplyResult =
  | { ok: true; lines: string[]; nextDraft?: SettingListPickerState }
  | { ok: false; lines: string[] }

export async function applySettingSaveCui(
  current: SettingListPickerState | null,
  locale: UiLocale,
  replaceUiSettingsState: (settings: UiSettings) => void,
  savedLine: (locale: UiLocale) => string,
  externalFailedLine: (locale: UiLocale) => string
): Promise<SettingCuiApplyResult> {
  if (current === null) {
    return { ok: false, lines: [] }
  }
  const draft = current.draft
  const { externalWriteFailed } = await replaceUiSettings(draft)
  replaceUiSettingsState(draft)
  const lines = [savedLine(locale)]
  if (externalWriteFailed) {
    lines.push(externalFailedLine(locale))
  }
  return { ok: true, lines }
}

export function applySettingSetCui(
  current: SettingListPickerState | null,
  key: string,
  value: string,
  unknownKeyLine: string,
  appliedLine: string
): SettingCuiApplyResult {
  if (current === null) {
    return { ok: false, lines: [unknownKeyLine] }
  }
  const patch = settingSetPatchFromArgs(key, value)
  if (patch === null) {
    return { ok: false, lines: [unknownKeyLine] }
  }
  const next = settingPickerApplyDraftToMain(current, patch)
  return { ok: true, lines: [appliedLine], nextDraft: next }
}

export function applySettingCancelCui(
  current: SettingListPickerState | null,
  cancelledLine: string
): SettingCuiApplyResult {
  if (current === null) {
    return { ok: true, lines: [cancelledLine] }
  }
  return { ok: true, lines: [cancelledLine] }
}

/** EN: Ensure a draft exists when applying `-set` without an open picker (use committed settings). */
export function ensureSettingDraftState(
  current: SettingListPickerState | null,
  committed: UiSettings
): SettingListPickerState {
  if (current !== null) {
    return current
  }
  return createSettingListPickerState(committed)
}

export function applySettingSetOntoState(
  current: SettingListPickerState,
  key: string,
  value: string
): SettingListPickerState | null {
  const patch = settingSetPatchFromArgs(key, value)
  if (patch === null) {
    return null
  }
  return settingPickerUpdateDraft(current, patch)
}
