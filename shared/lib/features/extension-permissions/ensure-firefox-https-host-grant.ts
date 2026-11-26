/**
 * EN: Firefox MV3 treats `host_permissions` as Origin Controls (optional). Temporary
 *     about:debugging installs auto-grant on ADDON_INSTALL only; Reload often leaves
 *     `permissions.contains(https)` false until the user re-grants. Re-request from a
 *     user-gesture path (toolbar / keyboard shortcut) and keep origins in
 *     `optional_host_permissions` (Firefox host adapter).
 * JA: Firefox MV3 の host_permissions は Origin Controls（実質 optional）。
 *     一時アドオンは ADDON_INSTALL 時のみ自動付与され、Reload 後は contains が false になりやすい。
 *     ツールバー／ショートカットのユーザー操作から再 request する。
 */

import { HTTPS_HOST_ORIGINS } from "./http-host-access.ts"

function isGeckoExtensionRuntime(): boolean {
  try {
    const manifest = chrome.runtime.getManifest() as chrome.runtime.Manifest & {
      browser_specific_settings?: { gecko?: unknown }
    }
    if (manifest.browser_specific_settings?.gecko !== undefined) {
      return true
    }
  } catch {
    /* fall through */
  }
  if (typeof navigator !== "undefined" && typeof navigator.userAgent === "string") {
    return /Firefox\//.test(navigator.userAgent)
  }
  return false
}

async function permissionsContainHttpsHost(): Promise<boolean> {
  if (typeof chrome === "undefined" || typeof chrome.permissions?.contains !== "function") {
    return false
  }
  try {
    if (await chrome.permissions.contains({ origins: [...HTTPS_HOST_ORIGINS] })) {
      return true
    }
  } catch {
    /* ignore */
  }
  try {
    if (await chrome.permissions.contains({ origins: ["https://example.com/"] })) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/**
 * EN: No-op on Chromium. On Gecko, request https host origins when missing.
 *     Must run from a user-gesture handler (commands / action.onClicked).
 * JA: Chromium では何もしない。Gecko で https host が無いとき request する（ユーザー操作必須）。
 */
export async function ensureFirefoxHttpsHostGrant(): Promise<boolean> {
  if (!isGeckoExtensionRuntime()) {
    return true
  }
  if (await permissionsContainHttpsHost()) {
    return true
  }
  if (typeof chrome.permissions?.request !== "function") {
    return false
  }
  try {
    const granted = await chrome.permissions.request({
      origins: [...HTTPS_HOST_ORIGINS]
    })
    return granted === true
  } catch {
    return false
  }
}
