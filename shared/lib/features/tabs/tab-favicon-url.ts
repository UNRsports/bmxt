/** MV3 Favicon API — https://developer.chrome.com/docs/extensions/how-to/ui/favicons */
/** Firefox: no `/_favicon/`; use `tabs.Tab.favIconUrl` instead. */

export const TAB_FAVICON_PX = 16

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
