/**
 * EN: How the popup shell (`bmxt.html`) is hosted per build target.
 *     Firefox: Manifest V3 `action.default_popup` overlay (desktop + Fenix).
 *     Chrome: `chrome.windows.create({ type: "popup" })` via `action.onClicked`.
 * JA: ポップアップシェルのホスト方式。Firefox は action オーバーレイ、
 *     Chrome は windows.create ポップアップ窓。
 */

/**
 * EN: True in the Firefox host build (`import.meta.env.FIREFOX` from WXT).
 * JA: Firefox ホストビルドなら true。
 */
export function usesActionPopupShell(): boolean {
  return import.meta.env.FIREFOX === true
}
