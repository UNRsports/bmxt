import { bodyToTerminalLines } from "../page-dom/dom-terminal-lines"
import { tDomList } from "../setting/i18n/ns/dom-list"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../setting/locale"
import { bmxtDomShowInjected, type DomShowMode } from "../page-dom/injected-dom-show"
import { domTreeGuideForDepth, parseDomTreeSourceLine } from "./dom-list-line-format"
import { domPickerModeLabel, type DomListFlavor, type DomPickerMode } from "./dom-picker-mode"
import { captureDomViewportForTab } from "./dom-viewport-capture"

export type DomTreeEntry = { line: string; path: readonly number[] }

export type DomListCapture = {
  lines: string[]
  jumpPaths: (readonly number[] | null)[]
  headerLineCount: number
}

type InjectedDomShowResult = {
  kind?: string
  body?: string
  entries?: Array<{ line?: string; path?: number[] }>
}

function displayTitle(t: string | undefined): string {
  const s = (t ?? "").trim()
  return s.length > 0 ? s : "(untitled)"
}

function formatTreeDisplayLine(sourceLine: string): string {
  const parsed = parseDomTreeSourceLine(sourceLine)
  if (!parsed) {
    return sourceLine
  }
  return `${domTreeGuideForDepth(parsed.depth)}${parsed.content}`
}

function flattenEntriesToBody(entries: readonly DomTreeEntry[]): string {
  return entries.map((e) => e.line).join("\n")
}

function entriesFromInjected(result: InjectedDomShowResult, mode: DomShowMode): DomTreeEntry[] {
  if (Array.isArray(result.entries) && result.entries.length > 0) {
    const out: DomTreeEntry[] = []
    for (const row of result.entries) {
      if (typeof row.line !== "string") {
        continue
      }
      const path = Array.isArray(row.path) ? row.path.filter((n) => Number.isInteger(n)) : []
      out.push({ line: row.line, path })
    }
    if (out.length > 0) {
      return out
    }
  }
  if (mode === "html") {
    return []
  }
  const body = typeof result.body === "string" ? result.body : ""
  return bodyToTerminalLines(body).map((line) => ({ line, path: [] as const }))
}

function filterEntries(entries: readonly DomTreeEntry[], pattern: string): DomTreeEntry[] {
  const pat = pattern.trim()
  if (pat.length === 0) {
    return [...entries]
  }
  const needle = pat.toLowerCase()
  return entries.filter((e) => e.line.toLowerCase().includes(needle))
}

function noticeCapture(lines: string[]): DomListCapture {
  const jumpPaths = lines.map(() => null)
  return { lines, jumpPaths, headerLineCount: lines.length }
}

/**
 * EN: Build picker lines + per-row jump paths from a scriptable tab.
 * JA: スクリプト可能なタブからピッカー行とジャンプ path を組み立てる。
 */
export async function captureDomListForTab(
  tab: chrome.tabs.Tab,
  flavor: string,
  pattern: string,
  locale: UiLocale = DEFAULT_UI_LOCALE,
  pickerMode: DomPickerMode = "normal"
): Promise<DomListCapture> {
  const flav: DomListFlavor = flavor === "--react" ? "--react" : "--html"
  if (pickerMode === "with") {
    return captureDomViewportForTab(tab, flav, pattern, locale)
  }
  const tabId = tab.id
  if (tabId === undefined) {
    return noticeCapture([tDomList("domList.unavailable", locale), tDomList("domList.noTarget", locale)])
  }

  const mode: DomShowMode = flav === "--react" ? "react" : "html"
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: bmxtDomShowInjected,
    args: [mode]
  })
  const injected = (result ?? {}) as InjectedDomShowResult
  const entries = filterEntries(entriesFromInjected(injected, mode), pattern)

  const header = [
    `dom -list ${domPickerModeLabel("normal")} (${flav})`,
    displayTitle(tab.title),
    tab.url ?? "(no url)",
    ""
  ]
  const headerLineCount = header.length

  if (entries.length === 0) {
    const pat = pattern.trim()
    return noticeCapture([
      ...header,
      pat.length === 0 ? "(empty capture)" : `(no lines matched "${pat}")`
    ])
  }

  const treeLines = entries.map((e) => formatTreeDisplayLine(e.line))
  const lines = [...header, ...treeLines]
  const jumpPaths: (readonly number[] | null)[] = [
    ...header.map(() => null),
    ...entries.map((e) => [...e.path])
  ]

  return { lines, jumpPaths, headerLineCount }
}

/** EN: Keep `bmxtDomShowInjected` body shape for log / terminal dumps. */
export function domShowBodyFromInjected(result: InjectedDomShowResult, mode: DomShowMode): string {
  if (mode === "html") {
    return typeof result.body === "string" ? result.body : ""
  }
  if (Array.isArray(result.entries) && result.entries.length > 0) {
    return flattenEntriesToBody(
      result.entries
        .filter((row): row is { line: string; path: number[] } => typeof row.line === "string")
        .map((row) => ({
          line: row.line,
          path: Array.isArray(row.path) ? row.path : []
        }))
    )
  }
  return typeof result.body === "string" ? result.body : ""
}
