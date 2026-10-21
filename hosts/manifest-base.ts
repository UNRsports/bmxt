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

export function hostPermissionsList(browser: HostBrowser): string[] {
  if (browser === "chrome") {
    // Chrome: favicon API + windows permission (required for chrome.windows.create popup).
    return ["favicon", ...sharedPermissions, "windows"]
  }
  // Firefox: no `favicon` permission; `windows` is not a valid Gecko permission string
  // (browser.windows still works under the WebExtensions API without declaring it).
  return [...sharedPermissions]
}

export function hostCommands(browser: HostBrowser) {
  // Chrome accepts `Shift+Alt+…`. Firefox MDN requires primary modifier first:
  // Ctrl|Alt|Command|MacCtrl, then optional Shift — e.g. `Alt+Shift+C`.
  // Same physical keys; string order differs or Gecko ignores the suggestion.
  const chromeKeys = {
    launch: { default: "Shift+Alt+C", mac: "Shift+Alt+C" },
    reset: { default: "Shift+Alt+R", mac: "Shift+Alt+R" },
    toggleFloat: { default: "Shift+Alt+F", mac: "Shift+Alt+F" }
  }
  const firefoxKeys = {
    launch: { default: "Alt+Shift+C", mac: "Alt+Shift+C" },
    reset: { default: "Alt+Shift+R", mac: "Alt+Shift+R" },
    toggleFloat: { default: "Alt+Shift+F", mac: "Alt+Shift+F" }
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
  const toggleFloat = {
    suggested_key: keys.toggleFloat,
    description: "__MSG_commandToggleBmxtFloat__"
  }

  if (browser === "chrome") {
    return {
      "launch-bmxt": { ...launch, global: true },
      "reset-bmxt": { ...reset, global: true },
      "toggle-bmxt-float": { ...toggleFloat, global: true }
    }
  }

  // Firefox: `commands.*.global` is not supported — shortcuts work only while Firefox is focused.
  return {
    "launch-bmxt": launch,
    "reset-bmxt": reset,
    "toggle-bmxt-float": toggleFloat
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
    extension_pages: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self'; style-src 'self'; ${imgSrc} font-src 'self' data:; worker-src 'self';`
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
