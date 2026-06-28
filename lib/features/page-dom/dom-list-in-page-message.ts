/** EN: Content-script channels for dom -list in-page work (semantic filter, path jump). */
/** JA: dom -list のページ内処理（意味論フィルタ・path ジャンプ）用 CS チャネル。 */

import { isDomSemanticKind, type DomSemanticKind } from "../dom/dom-semantic-kind.ts"
import type { DomShowMode } from "./injected-dom-show.ts"

export const DOM_SEMANTIC_ENTRIES_CHANNEL = "bmxt-dom-semantic-entries" as const

export const DOM_SCROLL_TO_PATH_CHANNEL = "bmxt-dom-scroll-to-path" as const

export const DOM_CLEAR_HIGHLIGHT_CHANNEL = "bmxt-dom-clear-highlight" as const

export type DomSemanticEntriesPayload = {
  entries?: Array<{ line?: string; path?: number[] }>
  truncated?: boolean
}

export type DomSemanticEntriesRequest = {
  channel: typeof DOM_SEMANTIC_ENTRIES_CHANNEL
  mode: DomShowMode
  kind: DomSemanticKind
}

export type DomScrollToPathRequest = {
  channel: typeof DOM_SCROLL_TO_PATH_CHANNEL
  path: number[]
  persist?: boolean
}

export type DomClearHighlightRequest = {
  channel: typeof DOM_CLEAR_HIGHLIGHT_CHANNEL
}

export type DomScrollToPathResponse = { ok: boolean }

export type DomClearHighlightResponse = { ok: boolean }

function isDomShowMode(value: unknown): value is DomShowMode {
  return value === "html" || value === "react"
}

function isIntegerPath(value: unknown): value is number[] {
  if (!Array.isArray(value)) {
    return false
  }
  for (const seg of value) {
    if (!Number.isInteger(seg)) {
      return false
    }
  }
  return true
}

export function isDomSemanticEntriesRequest(raw: unknown): raw is DomSemanticEntriesRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as DomSemanticEntriesRequest
  return (
    o.channel === DOM_SEMANTIC_ENTRIES_CHANNEL &&
    isDomShowMode(o.mode) &&
    isDomSemanticKind(o.kind)
  )
}

export function isDomScrollToPathRequest(raw: unknown): raw is DomScrollToPathRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as DomScrollToPathRequest
  return o.channel === DOM_SCROLL_TO_PATH_CHANNEL && isIntegerPath(o.path)
}

export function isDomClearHighlightRequest(raw: unknown): raw is DomClearHighlightRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  return (raw as DomClearHighlightRequest).channel === DOM_CLEAR_HIGHLIGHT_CHANNEL
}
