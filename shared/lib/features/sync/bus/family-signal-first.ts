/**
 * EN: First-command code on Family inventory WebRTC signals (closed token shape).
 * JA: Family 在庫シグナル用の第一コマンド符号（閉じたトークン形）。
 *
 * Wire field: `first` (e.g. `"tab"`). Subscribers match mechanically; unknown codes are ignored
 * by pickers that do not handle them.
 */

/** EN: Canonical first-command id carried on Family inventory signals. */
export type FamilySignalFirstCommand = string

const FIRST_COMMAND_RE = /^[a-z][a-z0-9]*$/

/** EN: Default when an older peer omits `first` on tabs_changed. */
export const FAMILY_SIGNAL_FIRST_DEFAULT_TAB: FamilySignalFirstCommand = "tab"

/**
 * EN: Normalize a wire `first` value. Missing → `"tab"` (tabs_changed compat). Invalid → null.
 * JA: ワイヤ上の `first` を正規化。欠落は `"tab"`（互換）。不正は null。
 */
export function normalizeFamilySignalFirstCommand(
  value: unknown
): FamilySignalFirstCommand | null {
  if (value === undefined || value === null) {
    return FAMILY_SIGNAL_FIRST_DEFAULT_TAB
  }
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 32) {
    return null
  }
  if (!FIRST_COMMAND_RE.test(trimmed)) {
    return null
  }
  return trimmed
}

/** EN: True when a tab-command picker should react to this signal. */
export function familySignalTargetsTabPicker(first: FamilySignalFirstCommand): boolean {
  return first === FAMILY_SIGNAL_FIRST_DEFAULT_TAB
}
