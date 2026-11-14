/**
 * EN: Scans non-discarded http(s) tabs only; skips chrome-extension:// etc.
 * JA: 破棄されていない http(s) タブのみ。chrome-extension:// 等は除外。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry"
import { collectPageMatchesFromOpenTab } from "../../page-extract/collect-tab-page-matches"
import { readOpenTabInnerText } from "../../page-extract/read-tab-inner-text"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"
import { MAX_MATCHES_PER_TAB, MAX_PAGE_TEXT_CHARS, PAGE_SCAN_PREFIX_CHARS } from "../limits"
import { linesForSearchPageTab } from "./page-find-blocks"
import {
  formatSearchPageProgress,
  shouldEmitSearchPageProgress,
  type SearchPageProgress
} from "./page-progress"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../../setting/locale"
import { tSearch } from "../../setting/i18n/ns/search"

const MAX_EMPTY_PREVIEW_LINES = 24
/**
 * EN: Hard wall-clock budget per tab (in-page match collect or empty-pattern preview read).
 * JA: タブあたりの壁時計上限（ページ内マッチ収集／空パターンのプレビュー読取）。
 */
const TAB_SCAN_BUDGET_MS = 4500

type SearchPageLongTab = {
  tabId: number
  title: string
  url: string
  length: number
}

type TabScanOutcome =
  | {
      kind: "matches"
      matches: SearchPageMatch[]
      truncatedLong: boolean
      length?: number
      ok: boolean
    }
  | {
      kind: "preview"
      text: string | null
      ok: boolean
    }

function withTabScanBudget(
  work: Promise<TabScanOutcome>,
  shouldCancel?: () => boolean
): Promise<TabScanOutcome> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: TabScanOutcome): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      clearInterval(cancelPoll)
      resolve(value)
    }
    const timer = setTimeout(() => {
      finish({ kind: "matches", matches: [], truncatedLong: false, ok: false })
    }, TAB_SCAN_BUDGET_MS)
    // EN: Stop waiting as soon as Ctrl+C flips the job flag (executeScript itself cannot abort).
    // JA: Ctrl+C でフラグが立ったら待ちを打ち切る（executeScript 自体は中断不可）。
    const cancelPoll = setInterval(() => {
      if (shouldCancel?.()) {
        finish({ kind: "matches", matches: [], truncatedLong: false, ok: false })
      }
    }, 80)
    work.then(
      (value) => {
        finish(value)
      },
      () => {
        finish({ kind: "matches", matches: [], truncatedLong: false, ok: false })
      }
    )
  })
}

export type SearchPageLinesOptions = {
  unlimit?: boolean
  /** EN: Structured progress for the prompt busy overall indicator. */
  onProgressInfo?: (progress: SearchPageProgress) => void | Promise<void>
}

function appendLongPageNotices(
  out: string[],
  longPages: SearchPageLongTab[],
  uiLocale: UiLocale
): void {
  if (longPages.length === 0) {
    return
  }
  out.push(
    tSearch("search.pageLongSkipped.summary", uiLocale, {
      count: String(longPages.length),
      limit: String(MAX_PAGE_TEXT_CHARS)
    })
  )
  for (const page of longPages) {
    out.push(
      tSearch("search.pageLongSkipped.row", uiLocale, {
        tabId: String(page.tabId),
        title: page.title || "(untitled)",
        url: page.url || "(no url)",
        length: String(page.length)
      })
    )
  }
  out.push(tSearch("search.pageLongSkipped.rerunHint", uiLocale))
}

export async function searchPageLines(
  pattern: string,
  onProgress?: (message: string) => Promise<void>,
  progressLabel = "search -list --page",
  shouldCancel?: () => boolean,
  uiLocale: UiLocale = DEFAULT_UI_LOCALE,
  options: SearchPageLinesOptions = {}
): Promise<string[]> {
  const unlimit = options.unlimit === true
  // EN: Default to a timed-safe prefix; `--unlimit` lifts the scan cap.
  // JA: 既定は時間内に収まる先頭長。`--unlimit` で上限を外す。
  const maxPageTextChars = unlimit ? 0 : PAGE_SCAN_PREFIX_CHARS
  const onProgressInfo = options.onProgressInfo
  const emit = async (p: SearchPageProgress) => {
    if (shouldCancel?.()) {
      return
    }
    if (onProgressInfo) {
      await onProgressInfo(p)
    }
    if (!onProgress) {
      return
    }
    if (p.phase === "tick" && !shouldEmitSearchPageProgress(p.tabIndex, p.tabTotal)) {
      return
    }
    await onProgress(formatSearchPageProgress(progressLabel, p, uiLocale))
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
    (t) => !t.discarded && typeof t.id === "number" && isScriptablePageUrl(t.url)
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
  const longPages: SearchPageLongTab[] = []
  let scanned = 0
  let skipped = 0
  let skippedLong = 0
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
    const url = tab.url ?? ""
    const title = tab.title ?? ""
    const windowId = typeof tab.windowId === "number" ? tab.windowId : 0

    // EN: Advance busy UI before the read so a hung tab is visible; log lines stay post-read.
    if (!shouldCancel?.() && onProgressInfo) {
      await onProgressInfo({
        phase: "tick",
        tabIndex: tabsChecked,
        tabTotal,
        scanned,
        skipped
      })
    }
    if (shouldCancel?.()) {
      cancelled = true
      break
    }

    const outcome = await withTabScanBudget(
      (async (): Promise<TabScanOutcome> => {
        if (matchAll) {
          const body = await readOpenTabInnerText(tab, maxPageTextChars || PAGE_SCAN_PREFIX_CHARS)
          return { kind: "preview", text: body, ok: body !== null }
        }
        const collected = await collectPageMatchesFromOpenTab(tab, pattern, {
          maxMatches: MAX_MATCHES_PER_TAB,
          maxTextChars: maxPageTextChars
        })
        if (collected === null) {
          return { kind: "matches", matches: [], truncatedLong: false, ok: false }
        }
        const truncatedLong =
          collected.truncated ||
          (!unlimit && collected.bodyLength > MAX_PAGE_TEXT_CHARS)
        return {
          kind: "matches",
          matches: collected.matches,
          truncatedLong,
          length: collected.bodyLength,
          ok: true
        }
      })(),
      shouldCancel
    )
    if (shouldCancel?.()) {
      cancelled = true
      break
    }

    if (outcome.kind === "matches" && outcome.truncatedLong && outcome.length !== undefined) {
      skippedLong += 1
      longPages.push({
        tabId,
        title: title || "(untitled)",
        url: url || "(no url)",
        length: outcome.length
      })
    }

    const ok = outcome.ok
    if (ok) {
      scanned += 1
    } else {
      skipped += 1
    }
    await emit({ phase: "tick", tabIndex: tabsChecked, tabTotal, scanned, skipped })

    if (matchAll) {
      if (outcome.kind !== "preview" || outcome.text === null) {
        continue
      }
      const previewLines = outcome.text
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

    if (outcome.kind !== "matches" || outcome.matches.length === 0) {
      continue
    }
    out.push(
      ...linesForSearchPageTab({
        tabId,
        windowId,
        title: title || "(untitled)",
        url: url || "(no url)",
        matches: outcome.matches
      })
    )
  }

  if (cancelled) {
    // EN: Do not emit "done"/tick after Ctrl+C — progress UI must stay quiet.
    // JA: Ctrl+C 後に完了・tick 進捗を出さない。
    return [`(cancelled — checked ${tabsChecked}/${tabTotal} tab(s); ${scanned} read, ${skipped} skipped)`]
  }

  await emit({ phase: "done", tabIndex: tabsChecked || tabTotal, tabTotal, scanned, skipped })

  if (scanned === 0 && tabs.length > 0 && longPages.length === 0) {
    return [
      "(no page text could be read from open http(s) tabs)",
      tSearch("search.pageNoTextHint", uiLocale),
      `scanned ${scanned} tab(s), skipped ${skipped}, ${tabTotal} http(s) tab(s) open`
    ]
  }

  if (out.length === 0 && longPages.length === 0) {
    return [
      "(no page matches in scanned tabs — pattern is case-insensitive substring per line, or empty pattern for tab summaries)",
      `scanned ${scanned} tab(s), skipped ${skipped} (permissions or unreadable), ${tabTotal} tab(s) checked`
    ]
  }

  const pageCount = out.filter((l) => l === "[page]").length
  const lineHitCount = out.filter((l) => l.startsWith("match: L") || l.startsWith("line: L")).length
  const longSuffix = skippedLong > 0 ? `, ${skippedLong} long page(s) truncated` : ""
  out.unshift(
    `(${matchAll ? scanned : pageCount} page(s), ${lineHitCount} line hit(s); scanned ${scanned} tab(s), skipped ${skipped}${longSuffix}; ${tabTotal} tab(s) checked)`
  )
  appendLongPageNotices(out, longPages, uiLocale)
  return out
}
