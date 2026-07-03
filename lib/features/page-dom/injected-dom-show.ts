/**
 * EN: Injected into the target tab via `chrome.scripting.executeScript` — no imports, no outer scope.
 * JA: 対象タブに注入。外部依存・クロージャを持たない実装にしてください。
 */

export type DomShowMode = "html" | "react"

type DomTreeEntryPayload = { line: string; path: number[] }

type ShowPayload = { kind: string; body: string; entries?: DomTreeEntryPayload[] }

/** EN: `-html`: per-element HTML snippets + paths; `body` keeps full documentElement.outerHTML for logs. */
export function bmxtDomShowInjected(mode: DomShowMode): ShowPayload {
  const entries: DomTreeEntryPayload[] = []

  function formatReactLine(el: Element, depth: number): string {
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
    const indent = "  ".repeat(depth)
    return indent + el.tagName.toLowerCase() + id + cls + fiber
  }

  function formatHtmlLine(el: Element, depth: number): string {
    const indent = "  ".repeat(depth)
    const snippet = el.outerHTML.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
    return indent + snippet
  }

  function walk(node: Node, depth: number, path: number[]): void {
    if (!node || node.nodeType !== 1) {
      return
    }
    const el = node as Element
    const line = mode === "html" ? formatHtmlLine(el, depth) : formatReactLine(el, depth)
    entries.push({ line, path: path.slice() })
    const kids = el.children
    for (let j = 0; j < kids.length; j += 1) {
      walk(kids[j], depth + 1, [...path, j])
    }
  }

  const bodyEl = document.body
  if (bodyEl) {
    walk(bodyEl, 0, [])
  }

  if (mode === "html") {
    const doc = document.documentElement
    const html = doc ? doc.outerHTML : ""
    return { kind: "html", body: html, entries }
  }

  const body = entries.map((e) => e.line).join("\n")
  return { kind: "react", body, entries }
}
