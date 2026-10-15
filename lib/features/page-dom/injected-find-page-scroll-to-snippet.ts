/**
 * EN: Injected via content script or `chrome.scripting.executeScript` — scroll to the Nth
 *     case-insensitive substring match of `snippet` in the page and briefly highlight it.
 * JA: ページ内の snippet 部分一致（大文字小文字無視）の occurrence 番目へスクロールして強調表示。
 */

import {
  applyBmxtNeedleHighlight,
  DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS,
  DEFAULT_NEEDLE_HIGHLIGHT_MS
} from "./injected-needle-highlight"
import { findRawNeedleInHaystack } from "./needle-occurrence"

export function bmxtFindPageScrollToSnippetInjected(
  snippet: string,
  occurrence: number,
  persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS,
  jumpBg = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.jumpBg,
  fg = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.fg
): { ok: boolean } {
  const needle = snippet.trim()
  if (!needle || !document.body) {
    return { ok: false }
  }
  const colors = { ...DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS, jumpBg, fg }
  let seen = 0

  const tryNode = (node: Text): { ok: boolean } | null => {
    const text = node.textContent ?? ""
    let from = 0
    while (from < text.length) {
      const hit = findRawNeedleInHaystack(text, needle, from)
      if (!hit) {
        break
      }
      if (seen === occurrence) {
        try {
          const range = document.createRange()
          range.setStart(node, hit.index)
          range.setEnd(node, Math.min(hit.index + hit.length, text.length))
          return { ok: applyBmxtNeedleHighlight(range, persistMs, colors) }
        } catch {
          return { ok: false }
        }
      }
      seen += 1
      from = hit.index + Math.max(1, hit.length)
    }
    return null
  }

  const walkRoot = (root: Document | Element | ShadowRoot): { ok: boolean } | null => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node: Text | null = walker.nextNode() as Text | null
    while (node) {
      const hit = tryNode(node)
      if (hit) {
        return hit
      }
      node = walker.nextNode() as Text | null
    }
    const hosts = root.querySelectorAll("*")
    for (let i = 0; i < hosts.length; i += 1) {
      const shadow = hosts[i]!.shadowRoot
      if (!shadow) {
        continue
      }
      const nested = walkRoot(shadow)
      if (nested) {
        return nested
      }
    }
    return null
  }

  return walkRoot(document.body) ?? { ok: false }
}
