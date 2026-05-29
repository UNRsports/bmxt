/**
 * EN: Scans non-discarded http(s) tabs only; skips chrome-extension:// etc.
 * JA: 破棄されていない http(s) タブのみ。chrome-extension:// 等は除外。
 */

import { readTabInnerText } from "../page-extract/read-tab-inner-text"
import { isHttpUrl } from "../url/is-http-url"
import { linesForFindElement, matchesNeedle, MAX_PAGE_TABS, MAX_PAGE_TEXT_CHARS } from "../search"
import {
  formatFindPageProgress,
  shouldEmitFindPageProgress,
  type FindPageProgress
} from "./page-progress"

const MAX_EMPTY_PREVIEW_LINES = 24
const MAX_LINE_HITS = 500

export async function findPageLines(
  pattern: string,
  onProgress?: (message: string) => Promise<void>,
  progressLabel = "find --page"
): Promise<string[]> {
  const emit = async (p: FindPageProgress) => {
    if (!onProgress) {
      return
    }
    if (p.phase === "tick" && !shouldEmitFindPageProgress(p.tabIndex, p.tabTotal)) {
      return
    }
    await onProgress(formatFindPageProgress(progressLabel, p))
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

  const tabs = prioritized.slice(0, MAX_PAGE_TABS)
  const out: string[] = []
  let totalHits = 0
  let scanned = 0
  let skipped = 0
  const matchAll = !pattern.trim()
  const tabTotal = tabs.length

  await emit({ phase: "start", tabIndex: 0, tabTotal, scanned: 0, skipped: 0 })

  for (let tabIndex = 0; tabIndex < tabs.length; tabIndex += 1) {
    const tab = tabs[tabIndex]!
    const tabId = tab.id
    if (tabId === undefined) {
      continue
    }
    const text = await readTabInnerText(tabId, MAX_PAGE_TEXT_CHARS)
    if (text === null) {
      skipped += 1
    } else {
      scanned += 1
    }
    await emit({ phase: "tick", tabIndex: tabIndex + 1, tabTotal, scanned, skipped })
    if (text === null) {
      continue
    }
    const url = tab.url ?? ""
    const title = tab.title ?? ""

    if (matchAll) {
      const previewLines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_EMPTY_PREVIEW_LINES)
      out.push("[page]")
      out.push(`title: ${title || "(untitled)"}`)
      out.push(`url: ${url || "(no url)"}`)
      if (previewLines.length > 0) {
        for (const pl of previewLines) {
          out.push(`text: ${pl}`)
        }
      } else {
        out.push("text: (no visible text in body.innerText)")
      }
      out.push("")
      totalHits += 1
      continue
    }

    if (!matchesNeedle(text, pattern)) {
      continue
    }
    const lines = text.split(/\r?\n/)
    let lineNo = 0
    for (const line of lines) {
      lineNo += 1
      if (!matchesNeedle(line, pattern)) {
        continue
      }
      const trimmed = line.trim().slice(0, 500)
      const suffix = line.length > 500 ? "…" : ""
      out.push(
        ...linesForFindElement("page", {
          title: title || "(untitled)",
          url: url || "(no url)",
          line: `L${lineNo}: ${trimmed}${suffix}`
        })
      )
      totalHits += 1
      if (totalHits >= MAX_LINE_HITS) {
        await emit({ phase: "done", tabIndex: tabTotal, tabTotal, scanned, skipped })
        out.unshift(
          `(stopped at ${totalHits} hit block(s) across tabs; raise limits in lib/features/search/limits.ts if needed)`
        )
        return out
      }
    }
  }

  await emit({ phase: "done", tabIndex: tabTotal, tabTotal, scanned, skipped })

  if (scanned === 0 && tabs.length > 0) {
    return [
      "(no page text could be read from open http(s) tabs)",
      "EN: With site access enabled, reload the pages you want to search (F5), then run find --page again.",
      "JA: サイトアクセスを有効にしている場合は、検索したいページを再読み込み（F5）してから find --page を再実行してください。",
      `scanned ${scanned} tab(s), skipped ${skipped}, max ${MAX_PAGE_TABS} tabs`
    ]
  }

  if (out.length === 0) {
    return [
      "(no page matches in scanned tabs — pattern is case-insensitive substring per line, or empty pattern for tab summaries)",
      `scanned ${scanned} tab(s), skipped ${skipped} (permissions or unreadable), max ${MAX_PAGE_TABS} tabs`
    ]
  }
  out.unshift(
    `(${matchAll ? scanned : totalHits} page block(s); scanned ${scanned} tab(s), skipped ${skipped}; cap ${MAX_PAGE_TABS} tabs)`
  )
  return out
}
