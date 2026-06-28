/**
 * EN: Scroll/highlight by child-index path — run in the content script bundle
 *     (`dom-list-in-page-handler.ts`), not via bare `executeScript({ func })`.
 * JA: path ジャンプ／ハイライト。常駐 CS バンドル内で実行。
 */

import { resolveNodeFromPath } from "./injected-dom-path.ts"

type ScrollOptions = {
  persist?: boolean
}

let highlightEl: HTMLElement | null = null
let highlightPrev = { outline: "", outlineOffset: "" }

function clearPersistedHighlight(): void {
  if (!highlightEl) {
    return
  }
  highlightEl.style.outline = highlightPrev.outline
  highlightEl.style.outlineOffset = highlightPrev.outlineOffset
  highlightEl = null
}

export function bmxtDomScrollToPathInjected(path: number[], options: ScrollOptions = {}): { ok: boolean } {
  const el = resolveNodeFromPath(path)
  if (!el) {
    return { ok: false }
  }
  try {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
  } catch {
    el.scrollIntoView()
  }
  const htmlEl = el as HTMLElement
  if (options.persist) {
    clearPersistedHighlight()
    highlightPrev = {
      outline: htmlEl.style.outline,
      outlineOffset: htmlEl.style.outlineOffset
    }
    highlightEl = htmlEl
    htmlEl.style.outline = "2px solid #58a6ff"
    htmlEl.style.outlineOffset = "2px"
    return { ok: true }
  }
  clearPersistedHighlight()
  const prevOutline = htmlEl.style.outline
  const prevOffset = htmlEl.style.outlineOffset
  htmlEl.style.outline = "2px solid #58a6ff"
  htmlEl.style.outlineOffset = "2px"
  window.setTimeout(() => {
    htmlEl.style.outline = prevOutline
    htmlEl.style.outlineOffset = prevOffset
  }, 1200)
  return { ok: true }
}

export function bmxtDomClearHighlightInjected(): { ok: boolean } {
  clearPersistedHighlight()
  return { ok: true }
}
