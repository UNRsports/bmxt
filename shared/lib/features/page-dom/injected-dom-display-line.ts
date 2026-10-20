/**
 * EN: Format dom -list row text for `--with` (visible text vs tag/snippet).
 * JA: dom -list `--with` 行の表示形式（可視テキスト / タグ・スニペット）。
 */

import type { DomShowMode } from "./injected-dom-show.ts"

export type DomLineDisplayKind = "tag" | "text"

function normalizeWhitespace(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
}

function imageAltLabel(el: Element, emptyImageAltLabel: string): string {
  const alt = (el.getAttribute("alt") ?? "").trim()
  return alt.length > 0 ? alt : emptyImageAltLabel
}

function formatVisibleTextLine(el: Element, emptyImageAltLabel: string): string {
  const tag = el.tagName.toLowerCase()
  if (tag === "img") {
    return imageAltLabel(el, emptyImageAltLabel)
  }
  if (tag === "input") {
    const inputType = (el.getAttribute("type") ?? "text").toLowerCase()
    if (inputType === "image") {
      return imageAltLabel(el, emptyImageAltLabel)
    }
  }
  if (tag === "picture") {
    const img = el.querySelector("img")
    if (img) {
      return imageAltLabel(img, emptyImageAltLabel)
    }
  }
  return normalizeWhitespace((el as HTMLElement).innerText ?? "")
}

function formatReactTagLine(el: Element): string {
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

function formatHtmlTagLine(el: Element, htmlSnippetMax: number): string {
  let snippet = el.outerHTML.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
  if (snippet.length > htmlSnippetMax) {
    snippet = snippet.slice(0, htmlSnippetMax) + "…"
  }
  return snippet
}

/** EN: One picker row for a single element. */
export function formatDomElementLine(
  el: Element,
  mode: DomShowMode,
  display: DomLineDisplayKind,
  emptyImageAltLabel: string,
  htmlSnippetMax: number
): string {
  if (display === "text") {
    return formatVisibleTextLine(el, emptyImageAltLabel)
  }
  return mode === "html" ? formatHtmlTagLine(el, htmlSnippetMax) : formatReactTagLine(el)
}
