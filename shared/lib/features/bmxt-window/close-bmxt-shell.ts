/**
 * EN: Close the BMXt popup shell after a last-session `exit` (`closeWindow`).
 *     Chrome: SW usually already `windows.remove`s the popup; `window.close` is a no-op.
 *     Firefox action overlay: there is no tracked window id — the page must close itself.
 * JA: 最終セッション exit 後にシェルを閉じる。Firefox オーバーレイは window.close 必須。
 */

export function closeBmxtShellIfRequested(closeWindow: boolean | undefined): void {
  if (closeWindow !== true) {
    return
  }
  try {
    window.close()
  } catch {
    /* already closed / not allowed */
  }
}
