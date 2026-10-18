/**
 * EN: Conservative check for "pages Chrome can script via chrome.scripting" under BMXt.
 *     Required `host_permissions` are https-only; returns true only for ordinary https
 *     sites that are NOT the Chrome Web Store and NOT the legacy `chrome.google.com/webstore`.
 *     Plain `http://` and other protocols (chrome://, chrome-extension://, about:,
 *     view-source:, file:, data:, devtools:, …) are treated as non-scriptable up-front.
 * JA: BMXt が `chrome.scripting` できるページか（必須 host は https のみ）。
 *     通常の https かつ Chrome ウェブストア／旧 webstore でないときだけ true。
 *     平文 `http://` とその他プロトコルは注入不可として事前に弾く。
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
  if (u.protocol !== "https:") {
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
  if (u.protocol === "https:") {
    const host = u.hostname.toLowerCase()
    if (NON_SCRIPTABLE_HOSTS.has(host)) {
      return `Chrome Web Store / extensions gallery (${host}) — Chrome forbids extension scripting on this host.`
    }
    return null
  }
  if (u.protocol === "http:") {
    return "protocol http: is not scriptable (BMXt in-page actions require https:)"
  }
  return `protocol ${u.protocol} is not scriptable from an extension`
}
