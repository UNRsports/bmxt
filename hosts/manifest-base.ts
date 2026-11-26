/**
 * EN: Shared manifest fields for Chrome / Firefox host packages.
 * JA: Chrome / Firefox ホスト向けの共通マニフェスト項目。
 */

export type HostBrowser = "chrome" | "firefox"

/** EN: Permissions shared by both hosts (Firefox omits Chrome-only / invalid-on-Gecko entries below). */
const sharedPermissions = [
  "tabs",
  "tabGroups",
  "storage",
  "unlimitedStorage",
  "scripting",
  "history",
  "bookmarks"
] as const

/**
 * EN: Required https + CLI loopback door origins (keep in sync with `http-host-access.ts`).
 * JA: 必須 https と CLI loopback（`http-host-access.ts` と同期）。
 */
export const HOST_ORIGIN_PERMISSIONS = [
  "https://*/*",
  "http://127.0.0.1:17653/*",
  "http://localhost:17653/*"
] as const

export function hostPermissionsList(browser: HostBrowser): string[] {
  if (browser === "chrome") {
    // Chrome: favicon API + windows permission (required for chrome.windows.create popup).
    // Family sync WebRTC lives in the BMXt prompt window only (no offscreen host).
    return ["favicon", ...sharedPermissions, "windows"]
  }
  // Firefox: no `favicon` permission; `windows` is not a valid Gecko permission string
  // (browser.windows still works under the WebExtensions API without declaring it).
  // Family sync WebRTC lives in the BMXt prompt window only (no dedicated peer tab).
  return [...sharedPermissions]
}

/**
 * EN: Firefox-only manifest extras for MV3 Origin Controls.
 *     - `granted_host_permissions`: temporary about:debugging installs auto-grant on
 *       ADDON_INSTALL (permanent AMO installs force this false at parse time).
 *     - `optional_host_permissions`: allows `permissions.request` after Reload when
 *       Origin Controls dropped the install-time grant.
 * JA: Firefox MV3 Origin Controls 向け。一時アドオンの INSTALL 時自動付与と、
 *     Reload 後の permissions.request 再取得用 optional_host_permissions。
 */
export function firefoxHostPermissionManifestExtras(): {
  granted_host_permissions: true
  optional_host_permissions: string[]
} {
  return {
    granted_host_permissions: true,
    optional_host_permissions: [...HOST_ORIGIN_PERMISSIONS]
  }
}

export function hostCommands(browser: HostBrowser) {
  // Chrome accepts `Shift+Alt+…`. Firefox MDN requires primary modifier first:
  // Ctrl|Alt|Command|MacCtrl, then optional Shift — e.g. `Alt+Shift+C`.
  // Same physical keys; string order differs or Gecko ignores the suggestion.
  // Chrome: at most 4 `suggested_key` entries in `commands` (MV3 load fails otherwise).
  const chromeKeys = {
    launch: { default: "Shift+Alt+C", mac: "Shift+Alt+C" },
    reset: { default: "Shift+Alt+R", mac: "Shift+Alt+R" }
  }
  const firefoxKeys = {
    launch: { default: "Alt+Shift+C", mac: "Alt+Shift+C" },
    reset: { default: "Alt+Shift+R", mac: "Alt+Shift+R" }
  }
  const keys = browser === "chrome" ? chromeKeys : firefoxKeys

  const launch = {
    suggested_key: keys.launch,
    description: "__MSG_commandLaunchBmxt__"
  }
  const reset = {
    suggested_key: keys.reset,
    description: "__MSG_commandResetBmxt__"
  }

  if (browser === "chrome") {
    return {
      "launch-bmxt": { ...launch, global: true },
      "reset-bmxt": { ...reset, global: true }
    }
  }

  // Firefox: `commands.*.global` is not supported — shortcuts work only while Firefox is focused.
  return {
    "launch-bmxt": launch,
    "reset-bmxt": reset
  }
}

/**
 * EN: Chrome favicons are same-origin (`/_favicon/`). Firefox uses `tabs.Tab.favIconUrl`
 * (often https:/http:/chrome:/moz-anno:), so img-src must allow those schemes.
 * JA: Chrome の favicon は同一オリジン。Firefox は `favIconUrl`（https 等）のため img-src を拡張。
 */
export function hostContentSecurityPolicy(browser: HostBrowser): {
  extension_pages: string
} {
  const imgSrc =
    browser === "firefox"
      ? "img-src 'self' data: blob: https: http: chrome: moz-anno:;"
      : "img-src 'self' data: blob:;"
  return {
    // EN: connect-src keeps 'self' plus the fixed CLI localhost listener only (todo §11).
    // JA: connect-src は 'self' と固定 CLI localhost 待ち受けのみ（todo §11）。
    extension_pages: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' http://127.0.0.1:17653 http://localhost:17653; style-src 'self'; ${imgSrc} font-src 'self' data:; worker-src 'self';`
  }
}

/** EN: Sized PNGs (pixel size must match key — AMO rejects a single 128 reused as 16/32/48). */
export const hostIcons = {
  16: "icon-16.png",
  32: "icon-32.png",
  48: "icon-48.png",
  128: "icon-128.png"
}

/** Fixed Firefox extension ID for AMO / temporary install. Confirm before AMO listing. */
export const FIREFOX_GECKO_ID = "bmxt@unrsports"

/**
 * EN: Desktop min must be ≥140 when declaring gecko.data_collection_permissions
 *     (AMO warning otherwise). tabGroups also needs a recent Gecko; 140 covers both.
 * JA: data_collection_permissions 宣言時は desktop ≥140 が必要（AMO 警告回避）。
 */
export const FIREFOX_STRICT_MIN_VERSION = "140.0"

/**
 * EN: Android built-in data-collection consent starts at 142; set when shipping Fenix.
 * JA: Android の組み込み同意 UI は 142 以降。
 */
export const FIREFOX_ANDROID_STRICT_MIN_VERSION = "142.0"
