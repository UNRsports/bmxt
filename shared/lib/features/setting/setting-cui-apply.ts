import {
  createSettingListPickerState,
  settingPickerApplyDraftToMain,
  settingPickerUpdateDraft,
  type SettingDraftPatch,
  type SettingListPickerState
} from "./setting-list-picker-state.ts"
import { replaceUiSettings, type UiSettings } from "./settings.ts"
import { normalizeSearchLegendMode } from "./search-legend-mode.ts"
import { DEFAULT_HOST_UI_MODE, type HostUiMode } from "./host-ui-mode.ts"
import type { UiLocale } from "./locale.ts"

export type SettingCuiApplyResult =
  | { ok: true; lines: string[]; nextDraft?: SettingListPickerState }
  | { ok: false; lines: string[] }

function parseBoolToken(value: string): boolean | null {
  const lower = value.trim().toLowerCase()
  if (lower === "on" || lower === "true" || lower === "1") {
    return true
  }
  if (lower === "off" || lower === "false" || lower === "0") {
    return false
  }
  return null
}

/** EN: Map `setting -set <key> <value>` onto a draft patch (closed key set). */
export function settingSetPatchFromArgs(
  key: string,
  value: string
): SettingDraftPatch | null {
  const k = key.trim().toLowerCase()
  const v = value.trim()
  if (k === "locale") {
    if (v === "ja" || v === "en") {
      return { locale: v }
    }
    return null
  }
  if (k === "edit-picker") {
    const b = parseBoolToken(v)
    return b === null ? null : { editPicker: b }
  }
  if (k === "ime-candidate-help") {
    const b = parseBoolToken(v)
    return b === null ? null : { imeCandidateHelp: b }
  }
  if (k === "search-legend") {
    return { searchLegendMode: normalizeSearchLegendMode(v) }
  }
  if (k === "host-ui") {
    if (v === "popup" || v === "float" || v === "both") {
      return { hostUiMode: v as HostUiMode }
    }
    if (v === "default") {
      return { hostUiMode: DEFAULT_HOST_UI_MODE }
    }
    return null
  }
  return null
}

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
