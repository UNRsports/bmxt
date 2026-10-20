import { resolveLiveTabFaviconSrc } from "../tabs/tab-picker-live-display"
import { resolveTabFaviconSrc } from "../tabs/tab-favicon-url"

type Props = {
  tabId: number
  url: string
}

/** EN: Favicon for search results rows whose URL is open in a tab. */
export function SearchPickerTabFavicon({ tabId, url }: Props) {
  const src = resolveLiveTabFaviconSrc(tabId, resolveTabFaviconSrc(url), url)
  if (!src) {
    return null
  }
  return (
    <img
      className="bmxt-tab-picker-tab-favicon bmxt-search-picker-tab-favicon"
      src={src}
      alt=""
      width={16}
      height={16}
      decoding="async"
      draggable={false}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden"
      }}
    />
  )
}
