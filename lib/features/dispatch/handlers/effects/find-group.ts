import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "find_group" }>

export async function applyFindGroupEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const q = e.query.trim().toLowerCase()
  if (!q) {
    return ["usage: find -group <query>"]
  }
  const groups = await chrome.tabGroups.query({})
  const hits = groups
    .filter((g) => (g.title || "").toLowerCase().includes(q))
    .map((g) => `${g.title || "(untitled group)"} [${g.color}]`)
  if (hits.length === 0) {
    return [`find -group: no matches for "${e.query}"`]
  }
  return [`find -group: ${hits.length} match(es)`, ...hits]
}
