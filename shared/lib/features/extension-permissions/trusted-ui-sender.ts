/**
 * EN: Allowlist for privileged SW messages (`RUN_CMD` / `NAV_CONTROL` / shell unload).
 *     Only same-extension UI pages may issue them — not content scripts or other extensions.
 *     Chrome popup (`windows.create`) and float iframe usually include `sender.tab`.
 *     Firefox `action.default_popup` overlay often omits `tab` — trust is URL origin + pathname.
 * JA: 特権 SW メッセージの送信元 allowlist。同一拡張 UI のみ。信頼判定は URL
 *     （Firefox オーバーレイは sender.tab が無いことがある）。
 */

import {
  isExtensionPageProtocol,
  TRUSTED_BMXT_UI_PATHS
} from "../extension-url/extension-page-url.ts"

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
 * EN: True when `sender` is the popup (`bmxt.html`) or float page (`bmxt-float.html`)
 *     on `chrome-extension:` or `moz-extension:` (same extension origin / page host).
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
  if (!isExtensionPageProtocol(parsed.protocol)) {
    return false
  }
  if (!isSameExtensionPageHost(parsed.hostname)) {
    return false
  }
  return TRUSTED_BMXT_UI_PATHS.has(parsed.pathname)
}
