/**
 * EN: Document-wide semantic filter for dom -list --with menu — run in the content script
 *     bundle (`dom-list-in-page-handler.ts`), not via bare `executeScript({ func })`.
 * JA: `--with` 意味論フィルタ。常駐 CS バンドル内で実行（`executeScript({ func })` 単体不可）。
 */

import {
  buildPathForElement,
  pathTargetsElement,
  walkAllElements
} from "./injected-dom-path.ts"
import { formatDomElementLine } from "./injected-dom-display-line.ts"
import { isElementVisibleInViewport } from "./injected-dom-viewport-visible.ts"

type DomShowMode = "html" | "react"

type SemanticKind = "link" | "image" | "form" | "button" | "heading"

export type DomSemanticCaptureScope = "document" | "viewport"

type ViewportEntryPayload = { line: string; path: number[] }

type SemanticPayload = {
  entries?: ViewportEntryPayload[]
  truncated?: boolean
}

function classifyElement(el: Element): SemanticKind[] {
  const kinds: SemanticKind[] = []
  const tag = el.tagName.toLowerCase()
  const role = (el.getAttribute("role") ?? "").toLowerCase()
  const href = (el.getAttribute("href") ?? "").trim()
  const inputType =
    tag === "input" ? (el.getAttribute("type") ?? "text").toLowerCase() : null
  const ce = el.getAttribute("contenteditable")

  if (tag === "a") {
    kinds.push("link")
  }
  if (tag === "area" && href.length > 0) {
    kinds.push("link")
  }
  if (role === "link") {
    kinds.push("link")
  }
  if (href.length > 0 && tag !== "base" && tag !== "link") {
    kinds.push("link")
  }
  if (tag === "summary") {
    kinds.push("link")
  }

  if (tag === "img" || tag === "picture") {
    kinds.push("image")
  }
  if (tag === "svg") {
    kinds.push("image")
  }
  if (tag === "object" || tag === "embed") {
    kinds.push("image")
  }
  if (role === "img") {
    kinds.push("image")
  }
  if (inputType === "image") {
    kinds.push("image")
  }

  if (tag === "textarea" || tag === "select" || tag === "output") {
    kinds.push("form")
  }
  if (
    tag === "input" &&
    inputType !== "button" &&
    inputType !== "submit" &&
    inputType !== "reset" &&
    inputType !== "image"
  ) {
    kinds.push("form")
  }
  if (ce === "" || ce === "true" || ce === "plaintext-only") {
    kinds.push("form")
  }
  if (
    role === "textbox" ||
    role === "combobox" ||
    role === "searchbox" ||
    role === "spinbutton" ||
    role === "listbox"
  ) {
    kinds.push("form")
  }

  if (tag === "button") {
    kinds.push("button")
  }
  if (tag === "input" && (inputType === "button" || inputType === "submit" || inputType === "reset")) {
    kinds.push("button")
  }
  if (
    role === "button" ||
    role === "menuitem" ||
    role === "menuitemcheckbox" ||
    role === "menuitemradio"
  ) {
    kinds.push("button")
  }

  if (/^h[1-6]$/.test(tag)) {
    kinds.push("heading")
  }
  if (role === "heading") {
    kinds.push("heading")
  }

  return [...new Set(kinds)]
}

/** EN: Semantic matches — full document or viewport-visible only (`--with` filter mode). */
export function bmxtDomSemanticEntriesInjected(
  mode: DomShowMode,
  kind: SemanticKind,
  scope: DomSemanticCaptureScope = "viewport",
  showTag = false,
  emptyImageAltLabel = "no alt"
): SemanticPayload {
  const maxDocumentResults = 500
  const maxViewportVisible = 120
  const htmlSnippetMax = 220
  const display = showTag ? "tag" : "text"
  const collected: Array<{ line: string; path: number[]; top: number; left: number }> = []
  let truncated = false

  walkAllElements((el) => {
    if (truncated || !classifyElement(el).includes(kind)) {
      return
    }
    if (scope === "viewport" && !isElementVisibleInViewport(el)) {
      return
    }
    const path = buildPathForElement(el)
    if (path == null || !pathTargetsElement(path, el)) {
      return
    }
    const cap = scope === "viewport" ? maxViewportVisible : maxDocumentResults
    if (collected.length >= cap) {
      truncated = true
      return
    }
    const line = formatDomElementLine(el, mode, display, emptyImageAltLabel, htmlSnippetMax)
    const rect = el.getBoundingClientRect()
    collected.push({ line, path: [...path], top: rect.top, left: rect.left })
  })

  if (scope === "viewport") {
    collected.sort((a, b) => {
      if (a.top !== b.top) {
        return a.top - b.top
      }
      return a.left - b.left
    })
  }

  const entries = collected.map(({ line, path }) => ({ line, path }))
  return { entries, truncated }
}
