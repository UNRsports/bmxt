/**
 * EN: Handle peer `dom_list` — capture DOM lines for a tab (document or viewport).
 * JA: peer `dom_list` — タブの DOM 行を取得（document / viewport）。
 */

import { captureDomListForTab } from "../../dom/dom-list-capture.ts"
import { captureDomViewportForTab } from "../../dom/dom-viewport-capture.ts"
import type { DomListFlavor } from "../../dom/dom-picker-mode.ts"
import { SEARCH_WIRE_SOFT_CAP_BYTES } from "../../search/peer/remote-search-wire-limits.ts"
import { DEFAULT_UI_LOCALE } from "../../setting/locale.ts"

const MAX_DOM_LIST_LINES = 4_000
/** EN: Leave headroom under DataChannel soft cap for JSON envelope. */
const MAX_DOM_LIST_WIRE_CHARS = Math.floor(SEARCH_WIRE_SOFT_CAP_BYTES * 0.7)

export type RemoteDomListRequest = {
  tabId: number
  scope: string
  flavor: string
  showTag: boolean
  pattern: string
}

function normalizeFlavor(raw: string): DomListFlavor {
  return raw.trim() === "--react" ? "--react" : "--html"
}

export async function applyRemoteDomList(req: RemoteDomListRequest): Promise<{
  ok: boolean
  detail: string | null
  lines: string[]
}> {
  if (!Number.isFinite(req.tabId) || req.tabId < 0) {
    return { ok: false, detail: "invalid tabId", lines: [] }
  }
  let tab: chrome.tabs.Tab
  try {
    tab = await chrome.tabs.get(req.tabId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: `tab not found: ${message}`, lines: [] }
  }

  const flavor = normalizeFlavor(req.flavor)
  const scope = req.scope.trim().toLowerCase() === "viewport" ? "viewport" : "document"
  const locale = DEFAULT_UI_LOCALE

  try {
    let lines: string[]
    if (scope === "viewport") {
      // EN: Same rows as extension `dom -list --with` (header includes that label).
      // JA: 拡張の `dom -list --with` と同じ行（ヘッダにその表示名が入る）。
      const capture = await captureDomViewportForTab(
        tab,
        flavor,
        req.pattern,
        locale,
        req.showTag
      )
      lines = capture.lines
    } else {
      // EN: Full-page tree like extension `dom -list --normal` (not flat --with store).
      // JA: 拡張の `dom -list --normal` と同じツリー（--with 用 flat ではない）。
      const capture = await captureDomListForTab(
        tab,
        flavor,
        req.pattern,
        locale,
        "normal",
        req.showTag
      )
      lines = capture.lines
    }
    let detail: string | null = null
    if (lines.length > MAX_DOM_LIST_LINES) {
      detail = `truncated to ${MAX_DOM_LIST_LINES} lines`
      lines = lines.slice(0, MAX_DOM_LIST_LINES)
    }
    // EN: Cap UTF-16 length so one DomListResult stays under the wire soft cap.
    // JA: DomListResult 1 通が wire soft cap を超えないよう文字数で切る。
    let charCount = 0
    let cutAt = lines.length
    for (let i = 0; i < lines.length; i += 1) {
      charCount += lines[i]!.length + 1
      if (charCount > MAX_DOM_LIST_WIRE_CHARS) {
        cutAt = i
        break
      }
    }
    if (cutAt < lines.length) {
      lines = lines.slice(0, Math.max(cutAt, 1))
      lines.push("(truncated)")
      detail = detail ?? `truncated to wire soft cap (~${MAX_DOM_LIST_WIRE_CHARS} chars)`
    }
    return { ok: true, detail, lines }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message, lines: [] }
  }
}
