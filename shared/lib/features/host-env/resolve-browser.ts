/**
 * EN: Browser axis — Chrome vs Firefox (extension page origin).
 * JA: ブラウザ軸。拡張ページ origin で Chrome / Firefox を判別する。
 */

export type HostBrowserId = "chrome" | "firefox"

/**
 * EN: True when this extension serves `moz-extension:` URLs (Firefox / Fenix).
 * JA: moz-extension なら true（Firefox / Fenix）。
 */
export function isFirefoxOrigin(): boolean {
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") {
      return false
    }
    return chrome.runtime.getURL("/").startsWith("moz-extension:")
  } catch {
    return false
  }
}

export function resolveHostBrowser(): HostBrowserId {
  return isFirefoxOrigin() ? "firefox" : "chrome"
}
