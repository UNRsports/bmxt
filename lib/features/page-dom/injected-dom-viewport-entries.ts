/**
 * EN: Injected — visible viewport elements in top-to-left sort with child-index paths.
 * JA: ビューポート内の可視要素を画面上位置順 + path で返す（注入専用）。
 */

import type { DomShowMode } from "./injected-dom-show.ts"
import { isElementVisibleInViewport } from "./injected-dom-viewport-visible.ts"

type ViewportEntryPayload = { line: string; path: number[] }

type ViewportPayload = {
  entries?: ViewportEntryPayload[]
}

/** EN: Same flavor as `bmxtDomShowInjected`, filtered to viewport-visible nodes. */
export function bmxtDomViewportEntriesInjected(mode: DomShowMode): ViewportPayload {
  const maxNodes = 2500
  const maxDepth = 48
  const maxVisible = 120
  const htmlSnippetMax = 220
  const collected: Array<{ line: string; path: number[]; top: number; left: number }> = []
  let count = 0

  function formatReactLine(el: Element): string {
    let fiber = ""
    const keys = Object.keys(el as unknown as Record<string, unknown>)
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i]
      if (k.startsWith("__reactFiber$") || k.startsWith("__reactProps$")) {
        fiber = " [react-internal]"
        break
      }
    }
    const id = el.id ? "#" + el.id : ""
    let cls = ""
    const cn = el.className
    if (typeof cn === "string" && cn) {
      const parts = cn.split(/\s+/).filter(Boolean).slice(0, 4)
      if (parts.length) {
        cls = "." + parts.join(".")
      }
    }
    return el.tagName.toLowerCase() + id + cls + fiber
  }

  function formatHtmlLine(el: Element): string {
    let snippet = el.outerHTML.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
    if (snippet.length > htmlSnippetMax) {
      snippet = snippet.slice(0, htmlSnippetMax) + "…"
    }
    return snippet
  }

  function walk(node: Node, depth: number, path: number[]): void {
    if (!node || count >= maxNodes || depth > maxDepth) {
      return
    }
    if (node.nodeType !== 1) {
      return
    }
    const el = node as Element
    count += 1
    if (isElementVisibleInViewport(el)) {
      const rect = el.getBoundingClientRect()
      const line = mode === "html" ? formatHtmlLine(el) : formatReactLine(el)
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
      if (count >= maxNodes) {
        return
      }
    }
  }

  const bodyEl = document.body
  if (bodyEl) {
    walk(bodyEl, 0, [])
  }

  collected.sort((a, b) => {
    if (a.top !== b.top) {
      return a.top - b.top
    }
    return a.left - b.left
  })

  const entries = collected.slice(0, maxVisible).map(({ line, path }) => ({ line, path }))
  return { entries }
}
