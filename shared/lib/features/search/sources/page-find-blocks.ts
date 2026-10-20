import type { SearchPageMatch } from "../../side-picker/model/picker-entry"

export type PageTabSearchHit = {
  tabId: number
  windowId: number
  title: string
  url: string
  matches: SearchPageMatch[]
}

/** EN: Terminal block for one tab's page search hits (picker + log). */
export function linesForSearchPageTab(hit: PageTabSearchHit): string[] {
  const out: string[] = [
    "[page]",
    `tabId: ${hit.tabId}`,
    `windowId: ${hit.windowId}`,
    `title: ${hit.title || "(untitled)"}`,
    `url: ${hit.url || "(no url)"}`
  ]
  for (const m of hit.matches) {
    out.push(`match: L${m.lineNo}: ${m.snippet}`)
  }
  out.push("")
  return out
}
