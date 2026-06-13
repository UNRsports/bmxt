/** MV3 Favicon API — https://developer.chrome.com/docs/extensions/how-to/ui/favicons */

export const TAB_FAVICON_PX = 16

export function isTabFaviconPageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
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

export function resolveTabFaviconSrc(pageUrl: string): string | null {
  return buildTabFaviconSrc(pageUrl, (path) => chrome.runtime.getURL(path))
}
