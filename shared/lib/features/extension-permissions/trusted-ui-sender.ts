/**
 * EN: Allowlist for privileged SW messages (`RUN_CMD` / `NAV_CONTROL`).
 *     Only same-extension UI pages may issue them — not content scripts or other extensions.
 *     `sender.tab` is expected: BMXt UI is a `windows.create` popup tab, and float is an
 *     iframe inside a host tab. Trust is URL origin + pathname, not absence of `tab`.
 * JA: 特権 SW メッセージ（`RUN_CMD` / `NAV_CONTROL`）の送信元 allowlist。
 *     同一拡張の UI ページのみ。コンテンツスクリプトや他拡張は拒否。
 *     `sender.tab` は付くのが正常（popup 窓内タブ／フロート iframe）。信頼判定は URL。
 */

const TRUSTED_UI_PATHS = new Set<string>(["/bmxt.html", "/bmxt-float.html"])

const EXTENSION_PAGE_PROTOCOLS = new Set<string>(["chrome-extension:", "moz-extension:"])

/**
 * EN: Hostname of this extension's page URLs.
 *     Chrome: equals `runtime.id`. Firefox: internal UUID in `moz-extension://…`
 *     (not the gecko.id like `bmxt@unrsports`).
 * JA: 拡張ページ URL の hostname。Chrome は runtime.id。Firefox は内部 UUID
 *    （gecko.id の `bmxt@unrsports` とは別）。
 */
function thisExtensionPageHostname(): string {
  try {
    return new URL(chrome.runtime.getURL("/")).hostname
  } catch {
    return chrome.runtime.id
  }
}

function isSameExtensionPageHost(hostname: string): boolean {
  if (hostname === chrome.runtime.id) {
    return true
  }
  return hostname === thisExtensionPageHostname()
}

/**
 * EN: True when `sender` is the popup (`bmxt.html`) or float page (`bmxt-float.html`).
 * JA: ポップアップまたはフロート UI からの送信なら true（Chrome / Firefox 拡張 origin）。
 */
export function isTrustedBmxtUiSender(sender: chrome.runtime.MessageSender): boolean {
  if (typeof sender.id === "string" && sender.id.length > 0 && sender.id !== chrome.runtime.id) {
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
  if (!EXTENSION_PAGE_PROTOCOLS.has(parsed.protocol)) {
    return false
  }
  if (!isSameExtensionPageHost(parsed.hostname)) {
    return false
  }
  return TRUSTED_UI_PATHS.has(parsed.pathname)
}
