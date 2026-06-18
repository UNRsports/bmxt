/** EN: Content-script channel to scroll/highlight a search needle in-page. */
export const PAGE_SCROLL_NEEDLE_CHANNEL = "bmxt-page-scroll-needle" as const

/** EN: Content-script channel to clear search needle highlights. */
export const PAGE_CLEAR_NEEDLE_CHANNEL = "bmxt-page-clear-needle" as const

export type BmxtNeedleHighlightColorsPayload = {
  hitBg: string
  jumpBg: string
  fg: string
}

export type PageScrollNeedleRequest = {
  channel: typeof PAGE_SCROLL_NEEDLE_CHANNEL
  searchNeedle: string
  lineNo: number
  snippetHint: string
  /** EN: Precomputed global needle index (0-based) from search indexing. */
  globalOccurrence?: number
  /** EN: 0-based hit index on `lineNo` when the line has multiple needle matches. */
  lineHitIndex?: number
  /** EN: Highlight colors for hit vs jump layers. */
  highlightColors?: BmxtNeedleHighlightColorsPayload
  /** EN: Only move jump highlight + scroll (detail picker row change). */
  activeOnly?: boolean
  /** EN: Auto-clear after ms; 0 keeps highlights until explicit clear. */
  persistMs?: number
}

export type PageClearNeedleRequest = {
  channel: typeof PAGE_CLEAR_NEEDLE_CHANNEL
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

export function isPageClearNeedleRequest(raw: unknown): raw is PageClearNeedleRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  return (raw as PageClearNeedleRequest).channel === PAGE_CLEAR_NEEDLE_CHANNEL
}
