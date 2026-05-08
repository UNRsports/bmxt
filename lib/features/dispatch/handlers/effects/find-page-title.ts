import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "find_page_title" }>

const MAX_LINES = 50

export async function applyFindPageTitleEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const q = e.query.trim().toLowerCase()
  if (!q) {
    return ["usage: find -pagetitle <query>"]
  }
  const tabs = await chrome.tabs.query({})
  const hits = tabs
    .filter((t) => (t.title || "").toLowerCase().includes(q))
    .map((t) => t.title || "(untitled)")
  if (hits.length === 0) {
    return [`find -pagetitle: no matches for "${e.query}"`]
  }
  const lines = hits.slice(0, MAX_LINES)
  if (hits.length > MAX_LINES) {
    lines.push(`...and ${hits.length - MAX_LINES} more`)
  }
  return [`find -pagetitle: ${hits.length} match(es)`, ...lines]
}
