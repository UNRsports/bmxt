/**
 * EN: Host UI form factor — drives soft keys and mobile layout class.
 * JA: ホスト UI 形態 — 補助キーとモバイル用レイアウトクラスを駆動する。
 *
 * Default `auto`: Android → mobile, otherwise desktop (install / runtime detect).
 * Manual `desktop` / `mobile` overrides for PC testing.
 */

export const HOST_UI_MODE_TOKENS = ["auto", "desktop", "mobile"] as const

export type HostUiMode = (typeof HOST_UI_MODE_TOKENS)[number]

/** EN: Resolved form factor after auto / override. */
export type HostUiFormFactor = "desktop" | "mobile"

export const DEFAULT_HOST_UI_MODE: HostUiMode = "auto"

/**
 * EN: Normalize stored / imported host UI mode.
 *     Also accepts legacy `extraKeysMode` tokens (`on`→mobile, `off`→desktop).
 */
export function normalizeHostUiMode(raw: unknown): HostUiMode {
  if (raw === "auto" || raw === "desktop" || raw === "mobile") {
    return raw
  }
  // EN: Legacy extra-keys preference from early 0.8.2 local builds.
  if (raw === "on") {
    return "mobile"
  }
  if (raw === "off") {
    return "desktop"
  }
  return DEFAULT_HOST_UI_MODE
}

export function isHostUiMode(raw: unknown): raw is HostUiMode {
  return raw === "auto" || raw === "desktop" || raw === "mobile"
}

/** EN: Resolve desktop vs mobile from preference + Android platform flag. */
export function resolveHostUiFormFactor(mode: HostUiMode, isAndroid: boolean): HostUiFormFactor {
  if (mode === "mobile") {
    return "mobile"
  }
  if (mode === "desktop") {
    return "desktop"
  }
  return isAndroid ? "mobile" : "desktop"
}

/** EN: Soft extra-keys bar follows the effective form factor. */
export function resolveExtraKeysVisible(mode: HostUiMode, isAndroid: boolean): boolean {
  return resolveHostUiFormFactor(mode, isAndroid) === "mobile"
}
