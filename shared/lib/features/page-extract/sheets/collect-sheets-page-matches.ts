/**
 * EN: Orchestrate in-tab Sheets load+match for `search --page` (compact results only).
 * JA: `search --page` 向け Sheets 取得＋マッチをタブ内で完結させる。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry.ts"
import { parseGoogleSheetsUrl } from "../../url/parse-google-sheets-url.ts"
import { clampPageExtractMaxChars } from "../page-extract-limits.ts"
import {
  bmxtCollectSheetsMatchesInPage,
  bmxtPreviewSheetsInPage,
  type SheetsInPageCollectResult,
  type SheetsInPagePreviewResult
} from "./sheets-collect-in-page.ts"

/** EN: Sheets XHR + parse needs more headroom than plain innerText tabs. */
const SHEETS_LOAD_MS = 14000
const DEFAULT_MAX_MATCHES = 500
/** EN: Default cell-character budget for Sheets (larger than HTML page prefix). */
const DEFAULT_SHEETS_TEXT_CHARS = 1_500_000
const MAX_PREVIEW_LINES = 24

type Timed<T> = { status: "ok"; value: T } | { status: "timeout" } | { status: "fail" }

export type CollectSheetsPageMatchesResult = {
  matches: SearchPageMatch[]
  bodyLength: number
  truncated: boolean
  title: string
}

export type CollectSheetsPageMatchesOutcome =
  | { kind: "ok"; result: CollectSheetsPageMatchesResult }
  | { kind: "unavailable"; reason: "not_sheets" | "no_tab" | "load_failed" | "timeout" }

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

function normalizeMatches(raw: SheetsInPageCollectResult): CollectSheetsPageMatchesResult | null {
  if (raw.ok !== true) {
    return null
  }
  const matches: SearchPageMatch[] = []
  for (const m of raw.matches) {
    if (typeof m.lineNo !== "number" || typeof m.snippet !== "string") {
      continue
    }
    const snippet = m.snippet.trim()
    if (!snippet) {
      continue
    }
    const cellRef =
      typeof m.cellRef === "string" ? m.cellRef.trim().toUpperCase() : ""
    const match: SearchPageMatch = {
      lineNo: Math.floor(m.lineNo),
      snippet,
      occurrence:
        typeof m.occurrence === "number" && Number.isFinite(m.occurrence)
          ? Math.max(0, Math.floor(m.occurrence))
          : 0
    }
    if (
      typeof m.globalOccurrence === "number" &&
      Number.isFinite(m.globalOccurrence) &&
      m.globalOccurrence >= 0
    ) {
      match.globalOccurrence = Math.floor(m.globalOccurrence)
    }
    if (/^[A-Z]{1,3}\d{1,7}$/.test(cellRef)) {
      match.cellRef = cellRef
    }
    matches.push(match)
  }
  return {
    matches,
    bodyLength: raw.bodyLength,
    truncated: raw.truncated,
    title: raw.title
  }
}

async function collectViaExecuteScript(
  tabId: number,
  spreadsheetId: string,
  gid: string,
  needle: string,
  maxMatches: number,
  maxTextChars: number
): Promise<Timed<CollectSheetsPageMatchesResult | null>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: bmxtCollectSheetsMatchesInPage,
      args: [spreadsheetId, gid, needle, maxMatches, maxTextChars]
    }),
    SHEETS_LOAD_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result as SheetsInPageCollectResult | undefined
  if (result === null || typeof result !== "object") {
    return { status: "ok", value: null }
  }
  return { status: "ok", value: normalizeMatches(result) }
}

async function previewViaExecuteScript(
  tabId: number,
  spreadsheetId: string,
  gid: string,
  maxTextChars: number
): Promise<Timed<SheetsInPagePreviewResult | null>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: bmxtPreviewSheetsInPage,
      args: [spreadsheetId, gid, MAX_PREVIEW_LINES, maxTextChars]
    }),
    SHEETS_LOAD_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result as SheetsInPagePreviewResult | undefined
  if (result === null || typeof result !== "object") {
    return { status: "ok", value: null }
  }
  return { status: "ok", value: result }
}

function resolveSheetsTextCap(maxTextChars: number | undefined): number {
  if (maxTextChars === 0) {
    return clampPageExtractMaxChars(0)
  }
  if (maxTextChars !== undefined && maxTextChars > 0) {
    return clampPageExtractMaxChars(maxTextChars)
  }
  return clampPageExtractMaxChars(DEFAULT_SHEETS_TEXT_CHARS)
}

/**
 * EN: Collect cell matches for an open Google Sheets tab (in-tab gviz/export/htmlembed).
 * JA: 開いている Google スプレッドシートタブのセルマッチを集める。
 */
export async function collectSheetsPageMatchesFromOpenTab(
  tab: chrome.tabs.Tab,
  needle: string,
  options?: {
    maxMatches?: number
    maxTextChars?: number
  }
): Promise<CollectSheetsPageMatchesOutcome> {
  const tabId = tab.id
  const parts = parseGoogleSheetsUrl(tab.url)
  const trimmed = needle.trim()
  if (tabId === undefined) {
    return { kind: "unavailable", reason: "no_tab" }
  }
  if (!parts) {
    return { kind: "unavailable", reason: "not_sheets" }
  }
  if (!trimmed) {
    return { kind: "unavailable", reason: "not_sheets" }
  }

  const maxMatches = Math.max(
    1,
    Math.min(options?.maxMatches ?? DEFAULT_MAX_MATCHES, DEFAULT_MAX_MATCHES)
  )
  const maxTextChars = resolveSheetsTextCap(options?.maxTextChars)

  const loaded = await collectViaExecuteScript(
    tabId,
    parts.spreadsheetId,
    parts.gid,
    trimmed,
    maxMatches,
    maxTextChars
  )
  if (loaded.status === "timeout") {
    return { kind: "unavailable", reason: "timeout" }
  }
  if (loaded.status === "fail" || loaded.value === null) {
    return { kind: "unavailable", reason: "load_failed" }
  }

  return {
    kind: "ok",
    result: {
      matches: loaded.value.matches,
      bodyLength: loaded.value.bodyLength,
      truncated: loaded.value.truncated,
      title: loaded.value.title || tab.title || ""
    }
  }
}

/**
 * EN: Preview lines from Sheets for empty-pattern `search -list --page`.
 * JA: 空パターンの `search -list --page` 向け Sheets プレビュー行。
 */
export async function readSheetsPreviewFromOpenTab(
  tab: chrome.tabs.Tab,
  maxTextChars: number
): Promise<{ kind: "ok"; text: string; truncated: boolean } | { kind: "unavailable" }> {
  const tabId = tab.id
  const parts = parseGoogleSheetsUrl(tab.url)
  if (tabId === undefined || !parts) {
    return { kind: "unavailable" }
  }
  const capped = resolveSheetsTextCap(maxTextChars === 0 ? 0 : maxTextChars)
  const loaded = await previewViaExecuteScript(
    tabId,
    parts.spreadsheetId,
    parts.gid,
    capped
  )
  if (loaded.status !== "ok" || loaded.value === null || loaded.value.ok !== true) {
    return { kind: "unavailable" }
  }
  return {
    kind: "ok",
    text: loaded.value.text,
    truncated: loaded.value.truncated
  }
}

/** EN: Wall-clock budget hint for page-adapter when scanning a Sheets tab. */
export const SHEETS_TAB_SCAN_BUDGET_MS = SHEETS_LOAD_MS + 1000
