import { resolveTabFaviconSrc } from "./tab-favicon-url"
import { resolveLiveTabUrl } from "./tab-picker-live-tab-fields"

/** EN: Favicon for picker rows — derived from live/row URL at render time. */
export function resolveLiveTabFaviconSrc(
  tabId: number,
  fallback: string | null,
  urlFallback: string
): string | null {
  const url = resolveLiveTabUrl(tabId, urlFallback)
  if (url !== "") {
    return resolveTabFaviconSrc(url)
  }
  return fallback
}
