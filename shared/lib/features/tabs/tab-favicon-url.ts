/** MV3 Favicon API — https://developer.chrome.com/docs/extensions/how-to/ui/favicons */
/** Firefox: no `/_favicon/`; use `tabs.Tab.favIconUrl` instead. */

export const TAB_FAVICON_PX = 16

/**
 * EN: Max character length for a portable favicon URL on the sync wire.
 * JA: sync ワイヤに載せる可搬 favicon URL の最大文字長。
 */
export const PORTABLE_REMOTE_FAVICON_MAX_CHARS = 2048

export function isTabFaviconPageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

/**
 * EN: Chrome declares the `favicon` permission; Firefox omits it (API unavailable).
 * JA: Chrome は `favicon` 権限を宣言。Firefox は未宣言（API 非対応）。
 */
export function manifestHasFaviconPermission(
  getPermissions: () => readonly string[] | undefined = readManifestPermissions
): boolean {
  const permissions = getPermissions()
  if (permissions === undefined) {
    return false
  }
  return permissions.includes("favicon")
}

function readManifestPermissions(): readonly string[] | undefined {
  const permissions = chrome.runtime.getManifest().permissions
  if (!Array.isArray(permissions)) {
    return undefined
  }
  const out: string[] = []
  for (const entry of permissions) {
    if (typeof entry === "string") {
      out.push(entry)
    }
  }
  return out
}

/**
 * EN: Sanitize `tabs.Tab.favIconUrl` for `<img src>` (reject scriptable schemes).
 * JA: `<img src>` 用に `favIconUrl` を検証（スクリプト可能なスキームを拒否）。
 */
export function normalizeTabFavIconUrl(favIconUrl: string | null | undefined): string | null {
  if (typeof favIconUrl !== "string") {
    return null
  }
  const trimmed = favIconUrl.trim()
  if (trimmed === "") {
    return null
  }
  if (/^(javascript:|vbscript:|file:)/i.test(trimmed)) {
    return null
  }
  if (
    /^(https?:|data:image\/|blob:|moz-extension:|chrome-extension:|chrome:|moz-anno:)/i.test(
      trimmed
    )
  ) {
    return trimmed
  }
  return null
}

/**
 * EN: Extract a favicon URL safe for the BMXt sync wire (browser-agnostic).
 *     Allowlist only — bare `https:` within {@link PORTABLE_REMOTE_FAVICON_MAX_CHARS}.
 *     Known wrappers such as `moz-anno:favicon:https:…` are unwrapped to the inner
 *     `https:` URL. Everything else (`data:`, `blob:`, extension-local, `http:`,
 *     `chrome:`, …) is dropped. Receivers with a favicon API may still resolve
 *     from page URL when this field is omitted.
 * JA: BMXt sync ワイヤ向けにファビコン URL を抽出する（ブラウザ非依存）。
 *     allowlist のみ — {@link PORTABLE_REMOTE_FAVICON_MAX_CHARS} 以内の素の `https:`。
 *     `moz-anno:favicon:https:…` 等の既知ラッパは内側の `https:` に展開する。
 *     それ以外（`data:` / `blob:` / 拡張ローカル / `http:` / `chrome:` など）は落とす。
 *     受信側に favicon API があれば、省略時は page URL から再解決できる。
 */
export function portableRemoteFavIconUrl(
  favIconUrl: string | null | undefined
): string | null {
  if (typeof favIconUrl !== "string") {
    return null
  }
  const trimmed = favIconUrl.trim()
  if (trimmed === "") {
    return null
  }

  let candidate: string | null = null
  if (/^https:\/\//i.test(trimmed)) {
    candidate = trimmed
  } else {
    const mozAnnoMatch = /^moz-anno:favicon:(https:\/\/\S+)/i.exec(trimmed)
    if (mozAnnoMatch !== null) {
      const inner = mozAnnoMatch[1]
      if (typeof inner === "string" && inner.length > 0) {
        candidate = inner
      }
    }
  }

  if (candidate === null) {
    return null
  }
  if (candidate.length > PORTABLE_REMOTE_FAVICON_MAX_CHARS) {
    return null
  }
  if (!/^https:\/\//i.test(candidate)) {
    return null
  }
  if (/^(javascript:|vbscript:|data:)/i.test(candidate)) {
    return null
  }
  return candidate
}

export function buildTabFaviconSrc(
  pageUrl: string,
  getExtensionUrl: (path: string) => string
): string | null {
  const trimmed = pageUrl.trim()
  if (!isTabFaviconPageUrl(trimmed)) {
    return null
  }
  const faviconUrl = new URL(getExtensionUrl("/_favicon/"))
  faviconUrl.searchParams.set("pageUrl", trimmed)
  faviconUrl.searchParams.set("size", String(TAB_FAVICON_PX))
  return faviconUrl.toString()
}

/**
 * EN: Chrome → extension `/_favicon/`; Firefox → `tab.favIconUrl` when provided.
 * JA: Chrome は `/_favicon/`、Firefox は渡された `tab.favIconUrl` を使う。
 */
export function resolveTabFaviconSrc(
  pageUrl: string,
  tabFavIconUrl?: string | null
): string | null {
  if (manifestHasFaviconPermission()) {
    return buildTabFaviconSrc(pageUrl, (path) => chrome.runtime.getURL(path))
  }
  return normalizeTabFavIconUrl(tabFavIconUrl)
}
