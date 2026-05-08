import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"

type E = Extract<ChromeEffect, { kind: "find_page_text" }>

const MAX_LINES = 30

function canScanTab(t: chrome.tabs.Tab): boolean {
  const u = t.url || t.pendingUrl || ""
  return /^https?:\/\//i.test(u)
}

export async function applyFindPageTextEffect(
  _ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const q = e.query.trim().toLowerCase()
  if (!q) {
    return ["usage: find -pagetext <query>"]
  }

  const tabs = await chrome.tabs.query({})
  const results: string[] = []
  let scanned = 0
  for (const t of tabs) {
    if (t.id === undefined || !canScanTab(t)) {
      continue
    }
    scanned += 1
    try {
      const out = await chrome.scripting.executeScript({
        target: { tabId: t.id },
        args: [q],
        func: (needle) => {
          const text = (
            document.body?.innerText ||
            document.documentElement?.innerText ||
            ""
          ).toLowerCase()
          return text.includes(needle)
        }
      })
      if (out[0]?.result) {
        results.push(t.title || "(untitled)")
      }
    } catch {
      // Ignore inaccessible pages (e.g. browser internal pages / restricted origins).
    }
  }

  if (results.length === 0) {
    return [`find -pagetext: no matches for "${e.query}" (scanned ${scanned} tab(s))`]
  }

  const lines = results.slice(0, MAX_LINES)
  if (results.length > MAX_LINES) {
    lines.push(`...and ${results.length - MAX_LINES} more`)
  }
  return [`find -pagetext: ${results.length} match(es) in ${scanned} scanned tab(s)`, ...lines]
}
