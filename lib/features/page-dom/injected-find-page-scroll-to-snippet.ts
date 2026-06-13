/**
 * EN: Injected via `chrome.scripting.executeScript` — scroll to the Nth case-insensitive
 *     substring match of `snippet` in the page and briefly highlight it.
 * JA: ページ内の snippet 部分一致（大文字小文字無視）の occurrence 番目へスクロールして強調表示。
 */

import {
  applyBmxtNeedleHighlight,
  DEFAULT_NEEDLE_HIGHLIGHT_MS
} from "./injected-needle-highlight"

export function bmxtFindPageScrollToSnippetInjected(
  snippet: string,
  occurrence: number,
  persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS
): { ok: boolean } {
  const needle = snippet.trim()
  if (!needle || !document.body) {
    return { ok: false }
  }
  const needleLower = needle.toLowerCase()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let seen = 0
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? ""
    let from = 0
    while (from < text.length) {
      const idx = text.toLowerCase().indexOf(needleLower, from)
      if (idx < 0) {
        break
      }
      if (seen === occurrence) {
        try {
          const range = document.createRange()
          range.setStart(node, idx)
          range.setEnd(node, Math.min(idx + needle.length, text.length))
          return { ok: applyBmxtNeedleHighlight(range, persistMs) }
        } catch {
          return { ok: false }
        }
      }
      seen += 1
      from = idx + Math.max(1, needle.length)
    }
  }
  return { ok: false }
}
