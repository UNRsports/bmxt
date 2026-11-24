/**
 * EN: Orchestrate Sheets CSV load (in-tab XHR) + SW-side needle match for `search --page`.
 * JA: Sheets CSV 取得（タブ内 XHR）と SW 側 needle マッチを繋ぐ。
 */

import type { SearchPageMatch } from "../../side-picker/model/picker-entry.ts"
import { parseGoogleSheetsUrl } from "../../url/parse-google-sheets-url.ts"
import { clampPageExtractMaxChars } from "../page-extract-limits.ts"
import {
  collectSheetsMatchesFromCsv,
  sheetsCsvPreviewLines
} from "./collect-sheets-matches-from-csv.ts"
import {
  bmxtLoadSheetsCsvInPage,
  type SheetsCsvLoadResult
} from "./sheets-csv-load-in-page.ts"

const SHEETS_LOAD_MS = 4500
const DEFAULT_MAX_MATCHES = 500
const DEFAULT_MAX_TEXT_CHARS = 120_000
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

async function loadCsvViaExecuteScript(
  tabId: number,
  spreadsheetId: string,
  gid: string,
  maxChars: number
): Promise<Timed<SheetsCsvLoadResult | null>> {
  const timed = await withTimeout(
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: bmxtLoadSheetsCsvInPage,
      args: [spreadsheetId, gid, maxChars]
    }),
    SHEETS_LOAD_MS
  )
  if (timed.status !== "ok") {
    return timed
  }
  const result = timed.value?.[0]?.result
  if (result === null || typeof result !== "object") {
    return { status: "ok", value: null }
  }
  return { status: "ok", value: result as SheetsCsvLoadResult }
}

/**
 * EN: Collect cell matches for an open Google Sheets tab.
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
  const rawMax =
    options?.maxTextChars !== undefined ? options.maxTextChars : DEFAULT_MAX_TEXT_CHARS
  const maxTextChars = clampPageExtractMaxChars(rawMax === 0 ? 0 : rawMax)

  const loaded = await loadCsvViaExecuteScript(
    tabId,
    parts.spreadsheetId,
    parts.gid,
    maxTextChars
  )
  if (loaded.status === "timeout") {
    return { kind: "unavailable", reason: "timeout" }
  }
  if (loaded.status === "fail" || loaded.value === null || loaded.value.ok !== true) {
    return { kind: "unavailable", reason: "load_failed" }
  }

  const scanned = collectSheetsMatchesFromCsv(
    loaded.value.text,
    trimmed,
    maxMatches,
    maxTextChars
  )
  return {
    kind: "ok",
    result: {
      matches: scanned.matches,
      bodyLength: scanned.bodyLength,
      truncated: loaded.value.truncated || scanned.truncated,
      title: loaded.value.title || tab.title || ""
    }
  }
}

/**
 * EN: Preview lines from Sheets CSV for empty-pattern `search -list --page`.
 * JA: 空パターンの `search -list --page` 向け Sheets CSV プレビュー行。
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
  const capped = clampPageExtractMaxChars(maxTextChars === 0 ? 0 : maxTextChars)
  const loaded = await loadCsvViaExecuteScript(
    tabId,
    parts.spreadsheetId,
    parts.gid,
    capped
  )
  if (loaded.status !== "ok" || loaded.value === null || loaded.value.ok !== true) {
    return { kind: "unavailable" }
  }
  const preview = sheetsCsvPreviewLines(loaded.value.text, MAX_PREVIEW_LINES, capped)
  return {
    kind: "ok",
    text: preview.lines.join("\n"),
    truncated: loaded.value.truncated || preview.truncated
  }
}
