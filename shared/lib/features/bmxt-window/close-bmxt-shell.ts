/**
 * EN: Close the BMXt popup shell after a last-session `exit` (`closeWindow`).
 *     Chrome: SW usually already `windows.remove`s the popup; `window.close` is a no-op.
 *     Firefox tab shell: SW removes the tab; `window.close` is a fallback.
 * JA: 最終セッション exit 後にシェルを閉じる。Firefox タブは SW が tabs.remove、
 *     window.close はフォールバック。
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
