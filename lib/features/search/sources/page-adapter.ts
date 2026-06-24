/**
 * EN: Scans non-discarded http(s) tabs only; skips chrome-extension:// etc.
 * JA: 破棄されていない http(s) タブのみ。chrome-extension:// 等は除外。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry"
import { readOpenTabInnerText } from "../../page-extract/read-tab-inner-text"
import { isHttpUrl } from "../../url/is-http-url"
import { matchesNeedle } from "../index"
import { MAX_PAGE_TEXT_CHARS } from "../limits"
import { collectPageMatchesForTab } from "../search-page-matches"
import { linesForSearchPageTab } from "./page-find-blocks"
import {
  formatSearchPageProgress,
  shouldEmitSearchPageProgress,
  type SearchPageProgress
} from "./page-progress"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../../setting/locale"
import { tSearch } from "../../setting/i18n/ns/search"

const MAX_EMPTY_PREVIEW_LINES = 24

export async function searchPageLines(
  pattern: string,
  onProgress?: (message: string) => Promise<void>,
  progressLabel = "search -list --page",
  shouldCancel?: () => boolean,
  uiLocale: UiLocale = DEFAULT_UI_LOCALE
): Promise<string[]> {
  const emit = async (p: SearchPageProgress) => {
    if (!onProgress) {
      return
    }
    if (p.phase === "tick" && !shouldEmitSearchPageProgress(p.tabIndex, p.tabTotal)) {
      return
    }
    await onProgress(formatSearchPageProgress(progressLabel, p))
  }
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

  const tabs = prioritized
  const out: string[] = []
  let scanned = 0
  let skipped = 0
  let tabsChecked = 0
  let cancelled = false
  const matchAll = !pattern.trim()
  const tabTotal = tabs.length

  await emit({ phase: "start", tabIndex: 0, tabTotal, scanned: 0, skipped: 0 })

  for (let tabIndex = 0; tabIndex < tabs.length; tabIndex += 1) {
    if (shouldCancel?.()) {
      cancelled = true
      tabsChecked = tabIndex
      break
    }
    const tab = tabs[tabIndex]!
    const tabId = tab.id
    if (tabId === undefined) {
      continue
    }
    tabsChecked = tabIndex + 1
    const text = await readOpenTabInnerText(tab, MAX_PAGE_TEXT_CHARS)
    if (shouldCancel?.()) {
      cancelled = true
      break
    }
    const url = tab.url ?? ""
    const title = tab.title ?? ""
    const windowId = typeof tab.windowId === "number" ? tab.windowId : 0
    const readable = text !== null

    if (readable) {
      scanned += 1
    } else {
      skipped += 1
    }
    await emit({ phase: "tick", tabIndex: tabsChecked, tabTotal, scanned, skipped })

    if (matchAll) {
      if (!readable) {
        continue
      }
      const previewLines = text!
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_EMPTY_PREVIEW_LINES)
      const matches: SearchPageMatch[] =
        previewLines.length > 0
          ? previewLines.map((pl, i) => ({
              lineNo: i + 1,
              snippet: pl.slice(0, 500),
              occurrence: 0
            }))
          : [{ lineNo: 0, snippet: "(no visible text in body.innerText)", occurrence: 0 }]
      out.push(
        ...linesForSearchPageTab({
          tabId,
          windowId,
          title: title || "(untitled)",
          url: url || "(no url)",
          matches
        })
      )
      continue
    }

    const tabMatches = collectPageMatchesForTab(title, text, pattern)
    if (tabMatches.length === 0) {
      continue
    }
    out.push(
      ...linesForSearchPageTab({
        tabId,
        windowId,
        title: title || "(untitled)",
        url: url || "(no url)",
        matches: tabMatches
      })
    )
  }

  await emit({ phase: "done", tabIndex: tabsChecked || tabTotal, tabTotal, scanned, skipped })

  if (cancelled) {
    const summary = `(cancelled — checked ${tabsChecked}/${tabTotal} tab(s); ${scanned} read, ${skipped} skipped)`
    if (out.length === 0) {
      return [summary]
    }
    out.unshift(summary)
    return out
  }

  if (scanned === 0 && tabs.length > 0) {
    return [
      "(no page text could be read from open http(s) tabs)",
      tSearch("search.pageNoTextHint", uiLocale),
      `scanned ${scanned} tab(s), skipped ${skipped}, ${tabTotal} http(s) tab(s) open`
    ]
  }

  if (out.length === 0) {
    return [
      "(no page matches in scanned tabs — pattern is case-insensitive substring per line, or empty pattern for tab summaries)",
      `scanned ${scanned} tab(s), skipped ${skipped} (permissions or unreadable), ${tabTotal} tab(s) checked`
    ]
  }
  const pageCount = out.filter((l) => l === "[page]").length
  const lineHitCount = out.filter((l) => l.startsWith("L")).length
  out.unshift(
    `(${matchAll ? scanned : pageCount} page(s), ${lineHitCount} line hit(s); scanned ${scanned} tab(s), skipped ${skipped}; ${tabTotal} tab(s) checked)`
  )
  return out
}
