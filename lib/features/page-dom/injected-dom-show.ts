/**
 * EN: Injected into the target tab via `chrome.scripting.executeScript` — no imports, no outer scope.
 * JA: 対象タブに注入。外部依存・クロージャを持たない実装にしてください。
 */

export type DomShowMode = "html" | "react"

type ShowPayload = { kind: string; body: string }

/** EN: `-html`: documentElement.outerHTML. `-react`: indented element tree + optional react-internal markers. */
export function bmxtDomShowInjected(mode: DomShowMode): ShowPayload {
  const MAX = 200000
  if (mode === "html") {
    const doc = document.documentElement
    const html = doc ? doc.outerHTML : ""
    const body = html.length > MAX ? html.slice(0, MAX) + "\n…(truncated)" : html
    return { kind: "html", body }
  }

  const lines: string[] = []
  let count = 0
  const maxNodes = 2500
  const maxDepth = 48

  function walk(node: Node, depth: number): void {
    if (!node || count >= maxNodes || depth > maxDepth) {
      return
    }
    if (node.nodeType !== 1) {
      return
    }
    const el = node as Element
    count += 1
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
    lines.push(indent + el.tagName.toLowerCase() + id + cls + fiber)
    const kids = el.children
    for (let j = 0; j < kids.length; j += 1) {
      walk(kids[j], depth + 1)
      if (count >= maxNodes) {
        return
      }
    }
  }

  const bodyEl = document.body
  if (bodyEl) {
    walk(bodyEl, 0)
  }
  let out = lines.join("\n")
  if (out.length > MAX) {
    out = out.slice(0, MAX) + "\n…(truncated)"
  }
  return { kind: "react", body: out }
}
