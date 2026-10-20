import { bmxtDomViewportEntriesInjected } from "../page-dom/injected-dom-viewport-entries.ts"
import type { DomShowMode } from "../page-dom/injected-dom-show.ts"
import { tDomList } from "../setting/i18n/ns/dom-list.ts"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../setting/locale.ts"
import { domPickerModeLabel, type DomListFlavor, type DomPickerMode } from "./dom-picker-mode.ts"
import type { DomListCapture, DomTreeEntry } from "./dom-list-capture.ts"

type InjectedViewportResult = {
  entries?: Array<{ line?: string; path?: number[] }>
}

function displayTitle(t: string | undefined): string {
  const s = (t ?? "").trim()
  return s.length > 0 ? s : "(untitled)"
}

function entriesFromInjected(result: InjectedViewportResult): DomTreeEntry[] {
  if (!Array.isArray(result.entries)) {
    return []
  }
  const out: DomTreeEntry[] = []
  for (const row of result.entries) {
    if (typeof row.line !== "string") {
      continue
    }
    const path = Array.isArray(row.path) ? row.path.filter((n) => Number.isInteger(n)) : []
    out.push({ line: row.line, path })
  }
  return out
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

function buildHeader(
  pickerMode: DomPickerMode,
  flavor: DomListFlavor,
  tab: chrome.tabs.Tab,
  showTag: boolean
): string[] {
  const modeToken = domPickerModeLabel(pickerMode)
  const tagToken = showTag ? " --tag" : ""
  return [
    `dom -list ${modeToken} (${flavor})${tagToken}`,
    displayTitle(tab.title),
    tab.url ?? "(no url)",
    ""
  ]
}

/**
 * EN: Viewport-visible elements only — flat list for `--with` picker mode.
 * JA: ビューポート内要素のみ（`--with` 用フラットリスト）。
 */
export async function captureDomViewportForTab(
  tab: chrome.tabs.Tab,
  flavor: DomListFlavor,
  pattern: string,
  locale: UiLocale = DEFAULT_UI_LOCALE,
  showTag = false
): Promise<DomListCapture> {
  const tabId = tab.id
  if (tabId === undefined) {
    return noticeCapture([tDomList("domList.unavailable", locale), tDomList("domList.noTarget", locale)])
  }

  const mode: DomShowMode = flavor === "--react" ? "react" : "html"
  const emptyImageAltLabel = tDomList("domList.emptyImageAlt", locale)
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: bmxtDomViewportEntriesInjected,
    args: [mode, showTag, emptyImageAltLabel]
  })
  const injected = (result ?? {}) as InjectedViewportResult
  const entries = filterEntries(entriesFromInjected(injected), pattern)
  const header = buildHeader("with", flavor, tab, showTag)
  const headerLineCount = header.length

  if (entries.length === 0) {
    const pat = pattern.trim()
    return noticeCapture([
      ...header,
      pat.length === 0
        ? tDomList("domList.viewportEmpty", locale)
        : tDomList("domList.viewportNoMatch", locale, { pattern: pat })
    ])
  }

  const bodyLines = entries.map((e) => e.line)
  const lines = [...header, ...bodyLines]
  const jumpPaths: (readonly number[] | null)[] = [
    ...header.map(() => null),
    ...entries.map((e) => [...e.path])
  ]

  return { lines, jumpPaths, headerLineCount }
}
