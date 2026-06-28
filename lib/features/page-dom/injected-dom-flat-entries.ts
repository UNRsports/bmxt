/**
 * EN: Flat dom -list --with entries — viewport-visible or full document.
 * JA: dom -list --with 用フラットリスト（ビューポート / ドキュメント全体）。
 */

import { formatDomElementLine } from "./injected-dom-display-line.ts"
import type { DomShowMode } from "./injected-dom-show.ts"
import { isElementVisibleInViewport } from "./injected-dom-viewport-visible.ts"

export type DomFlatEntriesScope = "viewport" | "document"

type FlatEntryPayload = { line: string; path: number[] }

type FlatEntriesPayload = {
  entries?: FlatEntryPayload[]
  truncated?: boolean
}

/** EN: Same flavor as `bmxtDomShowInjected`; scope filters to viewport or whole page. */
export function bmxtDomFlatEntriesInjected(
  mode: DomShowMode,
  showTag: boolean,
  emptyImageAltLabel: string,
  scope: DomFlatEntriesScope = "viewport"
): FlatEntriesPayload {
  const maxNodes = scope === "viewport" ? 2500 : 8000
  const maxDepth = 48
  const maxResults = scope === "viewport" ? 120 : 2500
  const htmlSnippetMax = 220
  const display = showTag ? "tag" : "text"
  const collected: Array<{ line: string; path: number[]; top: number; left: number }> = []
  let count = 0
  let truncated = false

  function walk(node: Node, depth: number, path: number[]): void {
    if (!node || count >= maxNodes || depth > maxDepth || truncated) {
      return
    }
    if (node.nodeType !== 1) {
      return
    }
    const el = node as Element
    count += 1
    if (scope === "document" || isElementVisibleInViewport(el)) {
      if (collected.length >= maxResults) {
        truncated = true
        return
      }
      const rect = el.getBoundingClientRect()
      const line = formatDomElementLine(el, mode, display, emptyImageAltLabel, htmlSnippetMax)
      collected.push({
        line,
        path: path.slice(),
        top: rect.top,
        left: rect.left
      })
    }
    const kids = el.children
    for (let j = 0; j < kids.length; j += 1) {
      walk(kids[j], depth + 1, [...path, j])
      if (count >= maxNodes || truncated) {
        return
      }
    }
  }

  const bodyEl = document.body
  if (bodyEl) {
    walk(bodyEl, 0, [])
  }

  if (scope === "viewport") {
    collected.sort((a, b) => {
      if (a.top !== b.top) {
        return a.top - b.top
      }
      return a.left - b.left
    })
  }

  const entries = collected.map(({ line, path }) => ({ line, path }))
  return truncated ? { entries, truncated: true } : { entries }
}

/** EN: Legacy alias — viewport-visible nodes only. */
export function bmxtDomViewportEntriesInjected(
  mode: DomShowMode,
  showTag: boolean,
  emptyImageAltLabel: string
): { entries?: FlatEntryPayload[] } {
  return bmxtDomFlatEntriesInjected(mode, showTag, emptyImageAltLabel, "viewport")
}

/** EN: Full-document flat list for `--with` internal search store. */
export function bmxtDomDocumentEntriesInjected(
  mode: DomShowMode,
  showTag: boolean,
  emptyImageAltLabel: string
): FlatEntriesPayload {
  return bmxtDomFlatEntriesInjected(mode, showTag, emptyImageAltLabel, "document")
}
