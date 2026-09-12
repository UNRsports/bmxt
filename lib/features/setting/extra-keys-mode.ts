/**
 * EN: Soft extra-keys bar visibility preference (mobile / touch hosts).
 * JA: ソフトキーバー（モバイル／タッチ向け）の表示設定。
 */

export const EXTRA_KEYS_MODE_TOKENS = ["auto", "on", "off"] as const

export type ExtraKeysMode = (typeof EXTRA_KEYS_MODE_TOKENS)[number]

export const DEFAULT_EXTRA_KEYS_MODE: ExtraKeysMode = "auto"

/** EN: Normalize stored / imported extra-keys mode (missing → auto). */
export function normalizeExtraKeysMode(raw: unknown): ExtraKeysMode {
  if (raw === "auto" || raw === "on" || raw === "off") {
    return raw
  }
  return DEFAULT_EXTRA_KEYS_MODE
}

export function isExtraKeysMode(raw: unknown): raw is ExtraKeysMode {
  return raw === "auto" || raw === "on" || raw === "off"
}

/** EN: Resolve whether the bar should render for the given mode and platform. */
export function resolveExtraKeysVisible(mode: ExtraKeysMode, isAndroid: boolean): boolean {
  if (mode === "on") {
    return true
  }
  if (mode === "off") {
    return false
  }
  return isAndroid
}
