import { bmxtDomDocumentEntriesInjected } from "../page-dom/injected-dom-viewport-entries.ts"
import type { DomShowMode } from "../page-dom/injected-dom-show.ts"
import { tDomList } from "../setting/i18n/ns/dom-list.ts"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../setting/locale.ts"
import type { DomListFlavor } from "./dom-picker-mode.ts"
import type { DomTreeEntry } from "./dom-list-capture.ts"

type InjectedDocumentResult = {
  entries?: Array<{ line?: string; path?: number[] }>
  truncated?: boolean
}

function entriesFromInjected(result: InjectedDocumentResult): DomTreeEntry[] {
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

/**
 * EN: Full-document flat entries for dom -list --with internal search store.
 * JA: dom -list --with の検索用にページ全体の flat エントリを取得する。
 */
export async function captureDomDocumentEntriesForTab(
  tab: chrome.tabs.Tab,
  flavor: DomListFlavor,
  locale: UiLocale = DEFAULT_UI_LOCALE,
  showTag = false
): Promise<{ entries: DomTreeEntry[]; truncated: boolean }> {
  const tabId = tab.id
  if (tabId === undefined) {
    return { entries: [], truncated: false }
  }

  const mode: DomShowMode = flavor === "--react" ? "react" : "html"
  const emptyImageAltLabel = tDomList("domList.emptyImageAlt", locale)
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: bmxtDomDocumentEntriesInjected,
    args: [mode, showTag, emptyImageAltLabel]
  })
  const injected = (result ?? {}) as InjectedDocumentResult
  return {
    entries: entriesFromInjected(injected),
    truncated: injected.truncated === true
  }
}
