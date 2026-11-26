/**
 * EN: Injected into the target tab via `chrome.scripting.executeScript` — no imports, no outer scope.
 *     All helpers must be nested inside `bmxtDomShowInjected` (Chrome serializes only this function).
 * JA: 対象タブに注入。外部依存・クロージャ禁止。
 *     ヘルパーはすべて `bmxtDomShowInjected` 内に置く（Chrome はこの関数だけをシリアライズする）。
 */

export type DomShowMode = "html" | "react"

type DomTreeEntryPayload = { line: string; path: number[] }

type ShowPayload = { kind: string; body: string; entries?: DomTreeEntryPayload[] }

/**
 * EN: `-html`: compact open-tag tree (not full outerHTML — that is O(n²) and times out on wire).
 *     `-react`: tag#id.class tree. Nested helpers only — required for executeScript.
 * JA: `-html` は開始タグ要約（outerHTML 全文は O(n²) で wire タイムアウト）。
 *     ヘルパーはネスト必須（executeScript）。
 */
export function bmxtDomShowInjected(mode: DomShowMode): ShowPayload {
  /** EN: Max chars for one `--html` open-tag line. */
  const HTML_OPEN_TAG_MAX_CHARS = 180
  const entries: DomTreeEntryPayload[] = []

  /**
   * EN: Opening-tag summary. Hierarchy comes from the walk; full outerHTML per node
   *     duplicates descendants and blows DataChannel `dom_list`.
   * JA: 開始タグ要約。階層は walk。outerHTML 全文は子孫を重複し DataChannel を壊す。
   */
  function formatHtmlOpenTagLine(el: Element, depth: number): string {
    const indent = "  ".repeat(depth)
    const tag = el.tagName.toLowerCase()
    let open = `<${tag}`
    if (el.id) {
      open += ` id="${el.id}"`
    }
    const cn = el.className
    if (typeof cn === "string" && cn.trim()) {
      const parts = cn
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
      if (parts.length > 0) {
        open += ` class="${parts.join(" ")}"`
      }
    }
    open += ">"
    const line = indent + open
    if (line.length <= HTML_OPEN_TAG_MAX_CHARS) {
      return line
    }
    return `${line.slice(0, HTML_OPEN_TAG_MAX_CHARS - 1)}…`
  }

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

  function walk(node: Node, depth: number, path: number[]): void {
    if (!node || node.nodeType !== 1) {
      return
    }
    const el = node as Element
    const line =
      mode === "html" ? formatHtmlOpenTagLine(el, depth) : formatReactLine(el, depth)
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

  // EN: Return entries only — duplicating them into `body` doubles executeScript clone cost.
  // JA: entries のみ返す。body へ複製すると executeScript のクローンコストが倍になる。
  return {
    kind: mode === "html" ? "html" : "react",
    body: "",
    entries
  }
}
