/**
 * EN: Injected via `chrome.scripting.executeScript` — scroll to a body descendant by child-index path.
 * JA: 子インデックス列で body 配下の要素へスクロールする（注入専用・依存なし）。
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
