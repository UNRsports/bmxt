import {
  applySettingDraftPatchToSettings,
  createSettingListPickerState,
  settingPickerApplyDraftToMain,
  settingPickerGoToView,
  settingPickerUpdateDraft,
  type SettingDraftPatch,
  type SettingListPickerState
} from "./setting-list-picker-state.ts"
import { replaceUiSettings, type UiSettings } from "./settings.ts"
import { settingSetPatchFromArgs } from "./setting-set-args.ts"
import type { UiLocale } from "./locale.ts"

export { settingSetPatchFromArgs } from "./setting-set-args.ts"

export type SettingCuiApplyResult =
  | { ok: true; lines: string[]; nextDraft?: SettingListPickerState; settings?: UiSettings }
  | { ok: false; lines: string[] }

export type CommitUiSettingsResult = {
  settings: UiSettings
  externalWriteFailed: boolean
}

/**
 * EN: Persist settings and mirror into React state (immediate-commit path).
 * JA: 設定を永続化し React 状態へ反映する（即時確定パス）。
 */
export async function commitUiSettings(
  next: UiSettings,
  replaceUiSettingsState: (settings: UiSettings) => void
): Promise<CommitUiSettingsResult> {
  const { externalWriteFailed } = await replaceUiSettings(next)
  replaceUiSettingsState(next)
  return { settings: next, externalWriteFailed }
}

/**
 * EN: Apply a patch, persist immediately, and sync open picker mirror to committed.
 * JA: パッチ適用→即永続化。開いているピッカーのミラーも committed に揃える。
 */
export async function commitSettingDraftPatch(
  current: SettingListPickerState | null,
  committed: UiSettings,
  patch: SettingDraftPatch,
  replaceUiSettingsState: (settings: UiSettings) => void,
  returnToMain: boolean
): Promise<CommitUiSettingsResult & { nextDraft: SettingListPickerState | null }> {
  const baseSettings = current !== null ? current.draft : committed
  const nextSettings = applySettingDraftPatchToSettings(baseSettings, patch)
  const result = await commitUiSettings(nextSettings, replaceUiSettingsState)
  if (current === null) {
    return { ...result, nextDraft: null }
  }
  const mirrored = returnToMain
    ? settingPickerGoToView("main", { ...current, draft: result.settings })
    : { ...current, draft: result.settings, editing: false, editDraft: "" }
  return { ...result, nextDraft: mirrored }
}

/** EN: Close-column alias for `setting -save` (settings already committed on apply). */
export async function applySettingSaveCui(
  _current: SettingListPickerState | null,
  locale: UiLocale,
  _replaceUiSettingsState: (settings: UiSettings) => void,
  closedLine: (locale: UiLocale) => string,
  _externalFailedLine: (locale: UiLocale) => string
): Promise<SettingCuiApplyResult> {
  return { ok: true, lines: [closedLine(locale)] }
}

/**
 * EN: `setting -set` — validate, persist immediately, sync picker mirror when open.
 * JA: `setting -set` — 検証のうえ即永続化。ピッカー開時はミラーも同期。
 */
export async function applySettingSetCui(
  current: SettingListPickerState | null,
  committed: UiSettings,
  key: string,
  value: string,
  replaceUiSettingsState: (settings: UiSettings) => void,
  unknownKeyLine: string,
  appliedLine: string,
  externalFailedLine: string
): Promise<SettingCuiApplyResult> {
  const patch = settingSetPatchFromArgs(key, value)
  if (patch === null) {
    return { ok: false, lines: [unknownKeyLine] }
  }
  const { settings, externalWriteFailed, nextDraft } = await commitSettingDraftPatch(
    current,
    committed,
    patch,
    replaceUiSettingsState,
    current !== null
  )
  const lines = [appliedLine]
  if (externalWriteFailed) {
    lines.push(externalFailedLine)
  }
  return {
    ok: true,
    lines,
    nextDraft: nextDraft ?? undefined,
    settings
  }
}

/** EN: Close-column alias for `setting -cancel` (no unsaved draft to discard). */
export function applySettingCancelCui(
  _current: SettingListPickerState | null,
  cancelledLine: string
): SettingCuiApplyResult {
  return { ok: true, lines: [cancelledLine] }
}

/** EN: Ensure a picker mirror exists when applying while the column is open. */
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

export { settingPickerApplyDraftToMain }
