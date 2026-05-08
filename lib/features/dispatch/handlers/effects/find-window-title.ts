import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "find_window_title" }>

/**
 * Chrome has no explicit window title API for normal browser windows.
 * We define "window title" as the active tab title in each window.
 */
export async function applyFindWindowTitleEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const q = e.query.trim().toLowerCase()
  if (!q) {
    return ["usage: find -windowtitle <query>"]
  }
  const windows = await chrome.windows.getAll({ populate: true })
  const hits: string[] = []
  for (const w of windows) {
    const active = (w.tabs || []).find((t) => t.active)
    const title = active?.title || ""
    if (!title.toLowerCase().includes(q)) {
      continue
    }
    hits.push(title)
  }
  if (hits.length === 0) {
    return [`find -windowtitle: no matches for "${e.query}"`]
  }
  return [`find -windowtitle: ${hits.length} match(es)`, ...hits]
}
