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
  const launch = {
    suggested_key: {
      default: "Shift+Alt+C",
      mac: "Shift+Alt+C"
    },
    description: "__MSG_commandLaunchBmxt__"
  }
  const reset = {
    suggested_key: {
      default: "Shift+Alt+R",
      mac: "Shift+Alt+R"
    },
    description: "__MSG_commandResetBmxt__"
  }
  const toggleFloat = {
    suggested_key: {
      default: "Shift+Alt+F",
      mac: "Shift+Alt+F"
    },
    description: "__MSG_commandToggleBmxtFloat__"
  }

  if (browser === "chrome") {
    return {
      "launch-bmxt": { ...launch, global: true },
      "reset-bmxt": { ...reset, global: true },
      "toggle-bmxt-float": { ...toggleFloat, global: true }
    }
  }

  // Firefox: `commands.*.global` is not supported — omit the field.
  return {
    "launch-bmxt": launch,
    "reset-bmxt": reset,
    "toggle-bmxt-float": toggleFloat
  }
}

export const hostContentSecurityPolicy = {
  extension_pages:
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self';"
}

export const hostIcons = {
  16: "icon.png",
  32: "icon.png",
  48: "icon.png",
  128: "icon.png"
}

/** Fixed Firefox extension ID for AMO / temporary install. Confirm before AMO listing. */
export const FIREFOX_GECKO_ID = "bmxt@unrsports"

/** Minimum Firefox version when relying on tabGroups (degrade below this in later phases). */
export const FIREFOX_STRICT_MIN_VERSION = "139.0"
