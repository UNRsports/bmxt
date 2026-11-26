/**
 * EN: Handle peer `dom_list` — capture DOM lines for a tab (document or viewport).
 *     Size limiting for the wire is done by chunk packing on the command bus.
 * JA: peer `dom_list` — タブの DOM 行を取得。wire 向け分割は command bus 側。
 */

import { captureDomListForTab } from "../../dom/dom-list-capture.ts"
import { captureDomViewportForTab } from "../../dom/dom-viewport-capture.ts"
import type { DomListFlavor } from "../../dom/dom-picker-mode.ts"
import { DEFAULT_UI_LOCALE } from "../../setting/locale.ts"

const MAX_DOM_LIST_LINES = 4_000

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
    return { ok: true, detail, lines }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message, lines: [] }
  }
}
