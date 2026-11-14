/**
 * EN: Collect page needle matches inside the tab (executeScript), return compact rows only.
 * JA: タブ内で needle マッチを収集し、コンパクトな行だけ返す。
 */

import type { SearchPageMatch } from "../side-picker/model/picker-entry"
import { clampPageExtractMaxChars } from "./page-extract-limits"
import {
  bmxtCollectPageNeedleMatchesInPage,
  type InPageNeedleMatchCollectResult
} from "./collect-page-needle-matches-in-page"
import { PAGE_EXTRACT_CHANNEL, type PageExtractRequest } from "./page-extract-message"

/** EN: Longer than plain text extract — GitHub innerText + line scan needs headroom. */
const TAB_MATCH_COLLECT_MS = 2800
const FALLBACK_MATCH_SCAN_CHARS = 80_000
/** EN: Local ceiling when caller omits maxMatches (mirrors search MAX_MATCHES_PER_TAB). */
const DEFAULT_MAX_MATCHES = 500
/** EN: Local default scan prefix when caller omits maxTextChars. */
const DEFAULT_MAX_TEXT_CHARS = 120_000

type Timed<T> = { status: "ok"; value: T } | { status: "timeout" } | { status: "fail" }

export type CollectTabPageMatchesResult = {
  matches: SearchPageMatch[]
  bodyLength: number
  truncated: boolean
  title: string
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<Timed<T>> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      resolve({ status: "timeout" })
    }, ms)
    promise.then(
      (value) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve({ status: "ok", value })
      },
      () => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        resolve({ status: "fail" })
      }
    )
  })
}

function normalizeCollectResult(raw: unknown): CollectTabPageMatchesResult | null {
  if (raw === null || typeof raw !== "object") {
    return null
  }
  const o = raw as InPageNeedleMatchCollectResult
  if (typeof o.title !== "string" || !Array.isArray(o.matches)) {
    return null
  }
  const bodyLength =
    typeof o.bodyLength === "number" && Number.isFinite(o.bodyLength)
      ? Math.max(0, Math.floor(o.bodyLength))
      : 0
  const truncated = o.truncated === true
  const matches: SearchPageMatch[] = []
  for (const item of o.matches) {
    if (item === null || typeof item !== "object") {
      continue
    }
    const m = item as Record<string, unknown>
    if (typeof m.lineNo !== "number" || typeof m.snippet !== "string") {
      continue
    }
    const snippet = m.snippet.trim()
    if (!snippet) {
      continue
    }
    const match: SearchPageMatch = {
      lineNo: Math.floor(m.lineNo),
      snippet,
      occurrence:
        typeof m.occurrence === "number" && Number.isFinite(m.occurrence)
          ? Math.max(0, Math.floor(m.occurrence))
          : 0
    }
    if (typeof m.globalOccurrence === "number" && Number.isFinite(m.globalOccurrence)) {
      match.globalOccurrence = Math.max(0, Math.floor(m.globalOccurrence))
    }
    matches.push(match)
  }
  return { title: o.title, bodyLength, truncated, matches }
}

async function collectViaExecuteScript(
  tabId: number,
  needle: string,
  maxMatches: number,
  maxTextChars: number
): Promise<Timed<CollectTabPageMatchesResult | null>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      func: bmxtCollectPageNeedleMatchesInPage,
      args: [needle, maxMatches, maxTextChars]
    }),
    TAB_MATCH_COLLECT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result
  return { status: "ok", value: normalizeCollectResult(result) }
}

async function collectViaContentScript(
  tabId: number,
  needle: string,
  maxMatches: number,
  maxTextChars: number
): Promise<Timed<CollectTabPageMatchesResult | null>> {
  const request: PageExtractRequest = {
    channel: PAGE_EXTRACT_CHANNEL,
    maxChars: maxTextChars,
    collectMatches: true,
    needle,
    maxMatches
  }
  const timed = await withTimeout(
    chrome.tabs.sendMessage(tabId, request) as Promise<unknown>,
    TAB_MATCH_COLLECT_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  return { status: "ok", value: normalizeCollectResult(timed.value) }
}

/**
 * EN: Prefer in-tab match collection so the SW never receives full page text.
 * JA: 拡張側に本文全文を運ばず、タブ内でマッチだけ集める。
 */
export async function collectPageMatchesFromOpenTab(
  tab: chrome.tabs.Tab,
  needle: string,
  options?: {
    maxMatches?: number
    maxTextChars?: number
  }
): Promise<CollectTabPageMatchesResult | null> {
  const tabId = tab.id
  const trimmed = needle.trim()
  if (tabId === undefined || !trimmed) {
    return null
  }
  const maxMatches = Math.max(
    1,
    Math.min(options?.maxMatches ?? DEFAULT_MAX_MATCHES, DEFAULT_MAX_MATCHES)
  )
  const rawMax =
    options?.maxTextChars !== undefined ? options.maxTextChars : DEFAULT_MAX_TEXT_CHARS
  const maxTextChars = clampPageExtractMaxChars(rawMax === 0 ? 0 : rawMax)

  const viaScript = await collectViaExecuteScript(tabId, trimmed, maxMatches, maxTextChars)
  if (viaScript.status === "ok" && viaScript.value !== null) {
    return viaScript.value
  }
  if (viaScript.status === "timeout" && maxTextChars > FALLBACK_MATCH_SCAN_CHARS) {
    // EN: Retry a smaller prefix before giving up (GitHub-scale pages).
    // JA: GitHub 級では短い先頭で再試行してから諦める。
    const small = await collectViaExecuteScript(
      tabId,
      trimmed,
      maxMatches,
      FALLBACK_MATCH_SCAN_CHARS
    )
    if (small.status === "ok" && small.value !== null) {
      return { ...small.value, truncated: true }
    }
  }

  // EN: Fast scripting failure → CS fallback (not after timeout — avoid double hang).
  // JA: scripting の即失敗時のみ CS へ（タイムアウト後の二重待ちはしない）。
  if (viaScript.status === "fail") {
    const viaCs = await collectViaContentScript(tabId, trimmed, maxMatches, maxTextChars)
    if (viaCs.status === "ok" && viaCs.value !== null) {
      return viaCs.value
    }
  }
  return null
}
