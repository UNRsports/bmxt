import type { FindPageMatch } from "../side-picker/model/picker-entry"

export type PageTabFindHit = {
  tabId: number
  windowId: number
  title: string
  url: string
  matches: FindPageMatch[]
}

/** EN: Terminal block for one tab's page find hits (picker + log). */
export function linesForFindPageTab(hit: PageTabFindHit): string[] {
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
