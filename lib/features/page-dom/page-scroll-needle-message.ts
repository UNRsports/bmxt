/** EN: Content-script channel to scroll/highlight a search needle in-page. */
export const PAGE_SCROLL_NEEDLE_CHANNEL = "bmxt-page-scroll-needle" as const

export type PageScrollNeedleRequest = {
  channel: typeof PAGE_SCROLL_NEEDLE_CHANNEL
  searchNeedle: string
  lineNo: number
  snippetHint: string
}

export type PageScrollNeedleResponse = { ok: boolean }

export function isPageScrollNeedleRequest(raw: unknown): raw is PageScrollNeedleRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as PageScrollNeedleRequest
  return (
    o.channel === PAGE_SCROLL_NEEDLE_CHANNEL &&
    typeof o.searchNeedle === "string" &&
    typeof o.lineNo === "number" &&
    typeof o.snippetHint === "string"
  )
}
