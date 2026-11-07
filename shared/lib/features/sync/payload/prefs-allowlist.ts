import {
  CMD_HISTORY_KEY,
  DOM_PICKER_SETTINGS_KEY,
  NAV_LEARNED_TARGETS_KEY,
  SEARCH_PICKER_SETTINGS_KEY,
  TABS_PICKER_SETTINGS_KEY,
  TOKEN_CANDIDATE_MRU_KEY,
  TUTORIAL_PROGRESS_KEY,
  TYPING_TRANSLATE_KEY,
  UI_SETTINGS_KEY
} from "../../extension-storage/keys"

/**
 * EN: Prefs keys eligible for Family sync (window/session/bounds excluded).
 * JA: Family 同期対象 prefs（窓・セッション・bounds は除外）。
 */
export const SYNC_PREFS_ALLOWLIST: readonly string[] = [
  UI_SETTINGS_KEY,
  CMD_HISTORY_KEY,
  TOKEN_CANDIDATE_MRU_KEY,
  TABS_PICKER_SETTINGS_KEY,
  SEARCH_PICKER_SETTINGS_KEY,
  DOM_PICKER_SETTINGS_KEY,
  TYPING_TRANSLATE_KEY,
  NAV_LEARNED_TARGETS_KEY,
  TUTORIAL_PROGRESS_KEY
] as const

export function isSyncPrefKey(key: string): boolean {
  return SYNC_PREFS_ALLOWLIST.includes(key)
}
