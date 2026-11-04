/**
 * EN: Shell hosting mode.
 *     Product matrix: Chrome PC/SP + Firefox PC → popup; Firefox SP → tab (only special case).
 * JA: シェル形態。Chrome PC/SP・Firefox PC は popup。特例は Firefox SP のタブのみ。
 */

import { isFirefoxOrigin } from "./resolve-browser.ts"
import { detectAndroidPlatformSync } from "./resolve-form-factor.ts"

export type HostShellMode = "popup" | "tab"

/**
 * EN: True only for Firefox on Android (SP) — tab-hosted `bmxt.html`.
 * JA: Firefox SP（Android）のときだけ true。タブで bmxt.html をホストする。
 */
export function usesTabShell(): boolean {
  return isFirefoxOrigin() && detectAndroidPlatformSync()
}

export function resolveShellMode(): HostShellMode {
  return usesTabShell() ? "tab" : "popup"
}
