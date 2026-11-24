/**
 * EN: Closed-set parser for `setting -set <key> <value>` (no storage / Chrome imports).
 * JA: `setting -set` の閉集合パーサ（ストレージ／Chrome 非依存）。
 */

import { DEFAULT_HOST_UI_MODE, type HostUiMode } from "./host-ui-mode.ts"
import { normalizeSearchLegendMode } from "./search-legend-mode.ts"
import type { SettingDraftPatch } from "./setting-list-picker-state.ts"

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
  if (k === "prompt-fire") {
    const b = parseBoolToken(v)
    return b === null ? null : { promptFire: b }
  }
  if (k === "search-legend") {
    return { searchLegendMode: normalizeSearchLegendMode(v) }
  }
  if (k === "host-ui") {
    if (v === "auto" || v === "desktop" || v === "mobile") {
      return { hostUiMode: v as HostUiMode }
    }
    if (v === "default") {
      return { hostUiMode: DEFAULT_HOST_UI_MODE }
    }
    return null
  }
  return null
}
