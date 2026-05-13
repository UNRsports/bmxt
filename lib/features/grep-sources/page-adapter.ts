/**
 * EN: Scans non-discarded http(s) tabs only; skips chrome-extension:// etc.
 * JA: 破棄されていない http(s) タブのみ。chrome-extension:// 等は除外。
 */

import {
  ensureOptionalHttpHostAccess,
  OPTIONAL_HOST_DENIED_LINES
} from "../extension-permissions/optional-http-hosts"
import { isHttpUrl } from "../url/is-http-url"
import { formatGrepLine, matchesNeedle, MAX_PAGE_TABS, MAX_PAGE_TEXT_CHARS } from "../search"

/** EN: Isolated-world snippet; keep self-contained for chrome.scripting.executeScript. */
function bmxtExtractPageInnerText(max: number): string {
  try {
    const t = document.body?.innerText ?? ""
    return t.length > max ? t.slice(0, max) : t
  } catch {
    return ""
  }
}

export async function grepPageLines(pattern: string): Promise<string[]> {
  let activeTabId: number | undefined
  try {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (typeof active?.id === "number") {
      activeTabId = active.id
    }
  } catch {
    activeTabId = undefined
  }

  const all = await chrome.tabs.query({})
  const candidates = all.filter(
    (t) => !t.discarded && typeof t.id === "number" && isHttpUrl(t.url)
  )
  candidates.sort((a, b) => {
    const la = (a as { lastAccessed?: number }).lastAccessed ?? 0
    const lb = (b as { lastAccessed?: number }).lastAccessed ?? 0
    return lb - la
  })

  const prioritized: typeof candidates = []
  if (activeTabId !== undefined) {
    const active = candidates.find((t) => t.id === activeTabId)
    if (active) {
      prioritized.push(active)
    }
  }
  for (const t of candidates) {
    if (t.id !== activeTabId) {
      prioritized.push(t)
    }
  }

  const tabs = prioritized.slice(0, MAX_PAGE_TABS)
  const out: string[] = []
  let totalHits = 0
  let scanned = 0
  let skipped = 0

  if (tabs.length > 0) {
    const access = await ensureOptionalHttpHostAccess()
    if (access === "denied") {
      return [...OPTIONAL_HOST_DENIED_LINES]
    }
  }

  for (const tab of tabs) {
    const tabId = tab.id
    if (tabId === undefined) {
      continue
    }
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: bmxtExtractPageInnerText,
        args: [MAX_PAGE_TEXT_CHARS]
      })
      scanned += 1
      const text = typeof result === "string" ? result : ""
      if (!matchesNeedle(text, pattern)) {
        continue
      }
      const lines = text.split(/\r?\n/)
      let lineNo = 0
      for (const line of lines) {
        lineNo += 1
        if (matchesNeedle(line, pattern)) {
          const url = tab.url ?? ""
          const title = tab.title ?? ""
          out.push(
            formatGrepLine(
              "page",
              `${tabId} ${url}`,
              `L${lineNo}: ${line.trim().slice(0, 500)}${line.length > 500 ? "…" : ""} — ${title}`
            )
          )
          totalHits += 1
          if (totalHits >= 500) {
            out.unshift(
              `(stopped at ${totalHits} line hit(s) across tabs; raise limits in lib/features/search/limits.ts if needed)`
            )
            return out
          }
        }
      }
    } catch {
      skipped += 1
    }
  }

  if (out.length === 0) {
    return [
      "(no page matches in scanned tabs — pattern is case-insensitive substring per line)",
      `scanned ${scanned} tab(s), skipped ${skipped} (permissions or unreadable), max ${MAX_PAGE_TABS} tabs`
    ]
  }
  out.unshift(
    `(${totalHits} line hit(s); scanned ${scanned} tab(s), skipped ${skipped}; cap ${MAX_PAGE_TABS} tabs)`
  )
  return out
}
