/**
 * EN: Conservative check for "pages Chrome refuses to script via chrome.scripting".
 *     Returns true only for ordinary http(s) sites that are NOT the Chrome Web Store
 *     and NOT the legacy `chrome.google.com/webstore`. Other protocols
 *     (chrome://, chrome-extension://, about:, view-source:, file:, data:, devtools:, …)
 *     are treated as non-scriptable up-front so we can show a clear message
 *     instead of bubbling Chrome's runtime exception "… cannot be scripted.".
 * JA: `chrome.scripting` で注入できない代表的なページを **事前に** 判定するための共有ユーティリティ。
 *     通常の http(s) かつ Chrome ウェブストア／旧 webstore でないときだけ true を返す。
 *     その他のプロトコル（`chrome://` 等）は注入不可として扱い、Chrome 実行時例外
 *     「… cannot be scripted.」を呼び出し側で待たずにわかりやすいメッセージを返せる。
 */

const NON_SCRIPTABLE_HOSTS = new Set<string>([
  // Legacy Web Store path lives under chrome.google.com/webstore but the host itself is
  // protected by Chrome — same behavior as the current host.
  "chrome.google.com",
  "chromewebstore.google.com"
])

export function isScriptablePageUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return false
  }
  const host = u.hostname.toLowerCase()
  if (NON_SCRIPTABLE_HOSTS.has(host)) {
    return false
  }
  return true
}

/** Human-readable reason a URL is rejected (returns null when the URL is scriptable). */
export function describeNonScriptableReason(url: string | undefined): string | null {
  if (!url) {
    return "no URL"
  }
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return `unparseable URL (${url})`
  }
  if (u.protocol === "http:" || u.protocol === "https:") {
    const host = u.hostname.toLowerCase()
    if (NON_SCRIPTABLE_HOSTS.has(host)) {
      return `Chrome Web Store / extensions gallery (${host}) — Chrome forbids extension scripting on this host.`
    }
    return null
  }
  return `protocol ${u.protocol} is not scriptable from an extension`
}
