/**
 * EN: Scans non-discarded http(s) tabs only; skips chrome-extension:// etc.
 *     Tab body reads run with bounded concurrency (pool), results assembled in priority order.
 * JA: 破棄されていない http(s) タブのみ。chrome-extension:// 等は除外。
 *     本文読取は上限付き並行。結果は優先順（アクティブ→最近）で組み立てる。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry"
import { collectPageMatchesFromOpenTab } from "../../page-extract/collect-tab-page-matches"
import { readOpenTabInnerText } from "../../page-extract/read-tab-inner-text"
import {
  readSheetsPreviewFromOpenTab,
  SHEETS_TAB_SCAN_BUDGET_MS
} from "../../page-extract/sheets/collect-sheets-page-matches"
import { isGoogleSheetsUrl } from "../../url/parse-google-sheets-url"
import { isScriptablePageUrl } from "../../url/is-scriptable-page-url"
import { MAX_MATCHES_PER_TAB, MAX_PAGE_TEXT_CHARS, PAGE_SCAN_PREFIX_CHARS } from "../limits"
import { linesForSearchPageTab } from "./page-find-blocks"
import { runPageScanPool } from "./page-scan-pool"
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

/**
 * EN: Max concurrent tab body reads. Keeps Chrome scripting load bounded while cutting wall time.
 * JA: 同時に読むタブ数の上限。scripting 負荷を抑えつつ壁時計を短縮する。
 */
const PAGE_TAB_SCAN_CONCURRENCY = 6

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

type TabScanSlot = {
  tabId: number
  windowId: number
  title: string
  url: string
  sheetsTab: boolean
  outcome: TabScanOutcome
}

function withTabScanBudget(
  work: Promise<TabScanOutcome>,
  shouldCancel?: () => boolean,
  budgetMs: number = TAB_SCAN_BUDGET_MS
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
    }, budgetMs)
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

function linesFromSlot(slot: TabScanSlot, matchAll: boolean): string[] {
  const { tabId, windowId, title, url, outcome } = slot
  if (matchAll) {
    if (outcome.kind !== "preview" || outcome.text === null) {
      return []
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
    return linesForSearchPageTab({
      tabId,
      windowId,
      title: title || "(untitled)",
      url: url || "(no url)",
      matches
    })
  }
  if (outcome.kind !== "matches" || outcome.matches.length === 0) {
    return []
  }
  return linesForSearchPageTab({
    tabId,
    windowId,
    title: title || "(untitled)",
    url: url || "(no url)",
    matches: outcome.matches
  })
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
  const matchAll = !pattern.trim()
  const tabTotal = tabs.length
  const slots: Array<TabScanSlot | undefined> = new Array(tabTotal)
  let scanned = 0
  let skipped = 0
  let tabsChecked = 0

  await emit({ phase: "start", tabIndex: 0, tabTotal, scanned: 0, skipped: 0 })

  const pool = await runPageScanPool(
    tabTotal,
    PAGE_TAB_SCAN_CONCURRENCY,
    async (tabIndex) => {
      const tab = tabs[tabIndex]
      if (!tab || tab.id === undefined) {
        return
      }
      const tabId = tab.id
      const url = tab.url ?? ""
      const title = tab.title ?? ""
      const windowId = typeof tab.windowId === "number" ? tab.windowId : 0
      const sheetsTab = isGoogleSheetsUrl(url)

      // EN: Pre-read tick — show which ordinal is in flight (completed+1 style via post-update).
      // JA: 読取前 tick。完了後の集計で進捗を進める。
      if (!shouldCancel?.() && onProgressInfo) {
        await onProgressInfo({
          phase: "tick",
          tabIndex: Math.min(tabTotal, tabsChecked + 1),
          tabTotal,
          scanned,
          skipped
        })
      }

      const outcome = await withTabScanBudget(
        (async (): Promise<TabScanOutcome> => {
          if (matchAll) {
            if (sheetsTab) {
              const sheetsPreview = await readSheetsPreviewFromOpenTab(
                tab,
                unlimit ? 0 : 1_500_000
              )
              if (sheetsPreview.kind === "ok") {
                return { kind: "preview", text: sheetsPreview.text, ok: true }
              }
              return { kind: "preview", text: null, ok: false }
            }
            const body = await readOpenTabInnerText(tab, maxPageTextChars || PAGE_SCAN_PREFIX_CHARS)
            return { kind: "preview", text: body, ok: body !== null }
          }
          const collected = await collectPageMatchesFromOpenTab(tab, pattern, {
            maxMatches: MAX_MATCHES_PER_TAB,
            maxTextChars: sheetsTab ? (unlimit ? 0 : undefined) : maxPageTextChars
          })
          if (collected === null) {
            return { kind: "matches", matches: [], truncatedLong: false, ok: false }
          }
          const truncatedLong = sheetsTab
            ? collected.truncated === true
            : collected.truncated ||
              (!unlimit && collected.bodyLength > MAX_PAGE_TEXT_CHARS)
          return {
            kind: "matches",
            matches: collected.matches,
            truncatedLong,
            length: collected.bodyLength,
            ok: true
          }
        })(),
        shouldCancel,
        sheetsTab ? SHEETS_TAB_SCAN_BUDGET_MS : TAB_SCAN_BUDGET_MS
      )

      slots[tabIndex] = {
        tabId,
        windowId,
        title,
        url,
        sheetsTab,
        outcome
      }

      tabsChecked += 1
      if (outcome.ok) {
        scanned += 1
      } else {
        skipped += 1
      }
      await emit({ phase: "tick", tabIndex: tabsChecked, tabTotal, scanned, skipped })
    },
    shouldCancel
  )

  if (pool.cancelled || shouldCancel?.()) {
    // EN: Do not emit "done"/tick after Ctrl+C — progress UI must stay quiet.
    // JA: Ctrl+C 後に完了・tick 進捗を出さない。
    return [
      `(cancelled — checked ${tabsChecked}/${tabTotal} tab(s); ${scanned} read, ${skipped} skipped)`
    ]
  }

  const out: string[] = []
  const longPages: SearchPageLongTab[] = []
  let skippedLong = 0
  let skippedSheets = 0
  let truncatedSheets = 0

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]
    if (!slot) {
      continue
    }
    const { outcome, sheetsTab, tabId, title, url } = slot
    if (outcome.kind === "matches" && outcome.truncatedLong && outcome.length !== undefined) {
      if (sheetsTab) {
        truncatedSheets += 1
      } else {
        skippedLong += 1
        longPages.push({
          tabId,
          title: title || "(untitled)",
          url: url || "(no url)",
          length: outcome.length
        })
      }
    }
    if (!outcome.ok && sheetsTab) {
      skippedSheets += 1
    }
    out.push(...linesFromSlot(slot, matchAll))
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
  if (skippedSheets > 0) {
    out.push(tSearch("search.sheets.loadFailed", uiLocale) + ` (${skippedSheets})`)
  }
  if (truncatedSheets > 0) {
    out.push(tSearch("search.sheets.truncatedHint", uiLocale))
  }
  appendLongPageNotices(out, longPages, uiLocale)
  return out
}
