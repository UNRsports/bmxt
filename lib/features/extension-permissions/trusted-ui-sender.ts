/**
 * EN: Allowlist for privileged SW messages (`RUN_CMD` / `NAV_CONTROL`).
 *     Only same-extension UI pages may issue them — not content scripts or other extensions.
 * JA: 特権 SW メッセージ（`RUN_CMD` / `NAV_CONTROL`）の送信元 allowlist。
 *     同一拡張の UI ページのみ。コンテンツスクリプトや他拡張は拒否。
 */

const TRUSTED_UI_PATHS = new Set<string>(["/bmxt.html", "/bmxt-float.html"])

/**
 * EN: True when `sender` is the popup (`bmxt.html`) or float page (`bmxt-float.html`).
 * JA: ポップアップまたはフロート UI からの送信なら true。
 */
export function isTrustedBmxtUiSender(sender: chrome.runtime.MessageSender): boolean {
  if (typeof sender.id === "string" && sender.id.length > 0 && sender.id !== chrome.runtime.id) {
    return false
  }
  // EN: Content scripts always carry `tab`; UI pages must not.
  if (sender.tab != null) {
    return false
  }
  const url = sender.url
  if (typeof url !== "string" || url.length === 0) {
    return false
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== "chrome-extension:") {
    return false
  }
  if (parsed.hostname !== chrome.runtime.id) {
    return false
  }
  return TRUSTED_UI_PATHS.has(parsed.pathname)
}
