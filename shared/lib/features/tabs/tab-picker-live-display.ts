import {
  manifestHasFaviconPermission,
  resolveTabFaviconSrc
} from "./tab-favicon-url"
import { resolveLiveTabFavicon, resolveLiveTabUrl } from "./tab-picker-live-tab-fields"

/** EN: Favicon for picker rows — Chrome derives from URL; Firefox uses live/row favIconUrl. */
export function resolveLiveTabFaviconSrc(
  tabId: number,
  fallback: string | null,
  urlFallback: string
): string | null {
  if (!manifestHasFaviconPermission()) {
    const live = resolveLiveTabFavicon(tabId)
    if (live !== null) {
      return live
    }
    return fallback
  }
  const url = resolveLiveTabUrl(tabId, urlFallback)
  if (url !== "") {
    return resolveTabFaviconSrc(url)
  }
  return fallback
}
