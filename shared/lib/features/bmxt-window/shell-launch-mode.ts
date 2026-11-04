/**
 * EN: How the popup shell (`bmxt.html`) is hosted per build target.
 *     Firefox: normal tab via `tabs.create` / focus existing (`action.onClicked`).
 *     Chrome: `chrome.windows.create({ type: "popup" })` via `action.onClicked`.
 * JA: ポップアップシェルのホスト方式。Firefox は通常タブ、Chrome は popup 窓。
 */

/**
 * EN: True in the Firefox host build (`import.meta.env.FIREFOX` from WXT).
 * JA: Firefox ホストビルドなら true。
 */
export function usesTabShell(): boolean {
  return import.meta.env.FIREFOX === true
}
