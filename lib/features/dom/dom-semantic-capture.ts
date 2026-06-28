import type { DomSemanticEntriesPayload } from "../page-dom/dom-list-in-page-message.ts"
import type { DomSemanticCaptureScope } from "../page-dom/injected-dom-semantic-entries.ts"
import type { DomShowMode } from "../page-dom/injected-dom-show.ts"
import { runDomSemanticEntriesOnTab } from "../page-dom/run-dom-in-page.ts"
import { tDomList } from "../setting/i18n/ns/dom-list.ts"
import { DEFAULT_UI_LOCALE, type UiLocale } from "../setting/locale.ts"
import type { DomListCapture, DomTreeEntry } from "./dom-list-capture.ts"
import type { DomListFlavor } from "./dom-picker-mode.ts"
import { domPickerModeLabel } from "./dom-picker-mode.ts"
import type { DomSemanticKind } from "./dom-semantic-kind.ts"
import { domSemanticKindI18nKey } from "./dom-semantic-kind.ts"
import { tDom } from "../setting/i18n/ns/dom.ts"

function displayTitle(t: string | undefined): string {
  const s = (t ?? "").trim()
  return s.length > 0 ? s : "(untitled)"
}

function entriesFromInjected(result: DomSemanticEntriesPayload): DomTreeEntry[] {
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

function noticeCapture(lines: string[]): DomListCapture {
  const jumpPaths = lines.map(() => null)
  return { lines, jumpPaths, headerLineCount: lines.length }
}

function buildHeader(
  flavor: DomListFlavor,
  tab: chrome.tabs.Tab,
  kind: DomSemanticKind,
  locale: UiLocale,
  showTag: boolean
): string[] {
  const modeToken = domPickerModeLabel("with")
  const kindLabel = tDom(domSemanticKindI18nKey(kind), locale)
  const tagToken = showTag ? " --tag" : ""
  return [
    `dom -list ${modeToken} (${flavor})${tagToken} · ${kindLabel}`,
    displayTitle(tab.title),
    tab.url ?? "(no url)",
    ""
  ]
}

/** EN: Semantic filter for dom -list --with (viewport-synced by default). */
export async function captureDomSemanticForTab(
  tab: chrome.tabs.Tab,
  flavor: DomListFlavor,
  kind: DomSemanticKind,
  locale: UiLocale = DEFAULT_UI_LOCALE,
  scope: DomSemanticCaptureScope = "viewport",
  showTag = false
): Promise<DomListCapture> {
  const tabId = tab.id
  if (tabId === undefined) {
    return noticeCapture([tDomList("domList.unavailable", locale), tDomList("domList.noTarget", locale)])
  }

  const mode: DomShowMode = flavor === "--react" ? "react" : "html"
  const emptyImageAltLabel = tDomList("domList.emptyImageAlt", locale)
  const injected = await runDomSemanticEntriesOnTab(
    tabId,
    mode,
    kind,
    scope,
    showTag,
    emptyImageAltLabel
  )
  const header = buildHeader(flavor, tab, kind, locale, showTag)
  const headerLineCount = header.length

  if (injected === null) {
    return noticeCapture([...header, tDomList("domList.captureFailed", locale)])
  }

  const entries = entriesFromInjected(injected)

  if (entries.length === 0) {
    const emptyKey =
      scope === "viewport" ? "domList.semanticViewportEmpty" : "domList.semanticEmpty"
    return noticeCapture([
      ...header,
      tDomList(emptyKey, locale, { kind: tDom(domSemanticKindI18nKey(kind), locale) })
    ])
  }

  const bodyLines = entries.map((e) => e.line)
  const noticeLines: string[] = []
  if (injected.truncated) {
    noticeLines.push(tDomList("domList.semanticTruncated", locale))
  }
  const lines = [...header, ...noticeLines, ...bodyLines]
  const jumpPaths: (readonly number[] | null)[] = [
    ...header.map(() => null),
    ...noticeLines.map(() => null),
    ...entries.map((e) => [...e.path])
  ]

  return { lines, jumpPaths, headerLineCount: header.length + noticeLines.length }
}
