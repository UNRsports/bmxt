/**
 * EN: How the popup shell (`bmxt.html`) is hosted.
 *     Firefox (`moz-extension:`): normal tab via `tabs.create` / focus existing.
 *     Chromium (`chrome-extension:`): `chrome.windows.create({ type: "popup" })`.
 *
 *     Do **not** use `import.meta.env.FIREFOX` here — `background-services` is
 *     bundled as IIFE for Chrome MV3 (`import.meta` is empty) and the same JS is
 *     copied into both host outputs.
 * JA: シェルのホスト方式。Firefox は通常タブ、Chromium は popup 窓。
 *     background-services の IIFE では import.meta が空なのでランタイム判定する。
 */

/**
 * EN: True when this extension page origin is Firefox (`moz-extension:`).
 * JA: Firefox（moz-extension）なら true。
 */
export function usesTabShell(): boolean {
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") {
      return false
    }
    return chrome.runtime.getURL("/").startsWith("moz-extension:")
  } catch {
    return false
  }
}
