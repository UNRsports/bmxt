/** EN: Content-script channel to scroll/highlight a snippet match in-page. */
export const PAGE_SCROLL_SNIPPET_CHANNEL = "bmxt-page-scroll-snippet" as const

export type PageScrollSnippetRequest = {
  channel: typeof PAGE_SCROLL_SNIPPET_CHANNEL
  snippet: string
  occurrence: number
}

export type PageScrollSnippetResponse = { ok: boolean }

export function isPageScrollSnippetRequest(raw: unknown): raw is PageScrollSnippetRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as PageScrollSnippetRequest
  return (
    o.channel === PAGE_SCROLL_SNIPPET_CHANNEL &&
    typeof o.snippet === "string" &&
    typeof o.occurrence === "number"
  )
}
