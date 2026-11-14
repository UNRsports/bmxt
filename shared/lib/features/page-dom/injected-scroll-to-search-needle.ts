/**
 * EN: Injected via content script or `chrome.scripting.executeScript` — scroll to a
 *     search needle and highlight it in-page. Pick order: snippet → line/hit →
 *     globalOccurrence (validated) → first. Snippet wins because huge DOMs may keep
 *     Ranges in document order while `globalOccurrence` is innerText-based.
 * JA: 検索語へスクロールして強調。選択は snippet → 行/ヒット → globalOccurrence
 *     （検証付き）→ 先頭。巨大 DOM では Range が document 順のままになり得るため
 *     snippet を優先する。
 */

import {
  applyBmxtSearchNeedleHighlightSession,
  DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS,
  MAX_INPAGE_HIT_HIGHLIGHT_RANGES,
  type BmxtNeedleHighlightColors
} from "./injected-needle-highlight"
import { findRawNeedleInHaystack, innerTextLinesFromBodyText } from "./needle-occurrence"
import { findRangeByContext, pickRangeForLine } from "./pick-search-needle-range"

export {
  findRangeByContext,
  pickRangeForLine,
  rangeAgreesWithSnippetHint
} from "./pick-search-needle-range"

let sessionNeedle = ""
let sessionRanges: Range[] = []

/**
 * EN: Stop collecting needle Ranges beyond this (DOM walk cost on large pages).
 * JA: この件数を超える Range 収集は打ち切る（大規模ページの DOM 走査コスト対策）。
 */
export const MAX_INPAGE_NEEDLE_RANGES = 500

/** EN: Reset cached ranges (detail picker closed or pattern changed). */
export function resetBmxtSearchNeedleSession(): void {
  sessionNeedle = ""
  sessionRanges = []
}

function innerTextLines(): string[] {
  return innerTextLinesFromBodyText(document.body?.innerText ?? "")
}

function appendNeedleRangesFromTextNode(
  node: Text,
  needle: string,
  ranges: Range[],
  maxRanges: number
): void {
  if (ranges.length >= maxRanges) {
    return
  }
  const text = node.textContent ?? ""
  let from = 0
  while (from < text.length) {
    if (ranges.length >= maxRanges) {
      return
    }
    const hit = findRawNeedleInHaystack(text, needle, from)
    if (!hit) {
      break
    }
    const range = document.createRange()
    range.setStart(node, hit.index)
    range.setEnd(node, Math.min(hit.index + hit.length, text.length))
    ranges.push(range)
    from = hit.index + Math.max(1, hit.length)
  }
}

/**
 * EN: Collect text ranges in light DOM and open shadow roots (innerText includes shadows;
 *     TreeWalker alone does not pierce them).
 * JA: light DOM と open shadow 内のテキスト Range を収集（innerText は shadow を含むが
 *     TreeWalker 単体では貫通しない）。
 */
function collectNeedleRangesFromRoot(
  root: Document | Element | ShadowRoot,
  needle: string,
  ranges: Range[],
  maxRanges: number
): void {
  if (ranges.length >= maxRanges) {
    return
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Text | null = walker.nextNode() as Text | null
  while (node) {
    if (ranges.length >= maxRanges) {
      return
    }
    appendNeedleRangesFromTextNode(node, needle, ranges, maxRanges)
    node = walker.nextNode() as Text | null
  }
  const hosts = root.querySelectorAll("*")
  for (let i = 0; i < hosts.length; i += 1) {
    if (ranges.length >= maxRanges) {
      return
    }
    const shadow = hosts[i]!.shadowRoot
    if (shadow) {
      collectNeedleRangesFromRoot(shadow, needle, ranges, maxRanges)
    }
  }
}

function collectNeedleRanges(needle: string, maxRanges = MAX_INPAGE_NEEDLE_RANGES): Range[] {
  const trimmed = needle.trim()
  if (!trimmed || !document.body) {
    return []
  }
  const ranges: Range[] = []
  collectNeedleRangesFromRoot(document.body, trimmed, ranges, maxRanges)
  return ranges
}

function collectNeedleRangesInInnerTextOrder(needle: string): Range[] {
  const trimmed = needle.trim()
  if (!trimmed || !document.body) {
    return []
  }
  const domRanges = collectNeedleRanges(trimmed, MAX_INPAGE_NEEDLE_RANGES)
  if (domRanges.length === 0) {
    return []
  }

  // EN: Full innerText reorder is O(lines × ranges) and freezes GitHub-sized pages.
  //     Above the paint cap, keep document order and rely on globalOccurrence / snippet.
  // JA: 全行再整列は O(行×Range) で GitHub 級を固める。塗布上限超では document 順のまま。
  if (domRanges.length > MAX_INPAGE_HIT_HIGHLIGHT_RANGES) {
    return domRanges
  }

  const lines = innerTextLines()
  const ordered: Range[] = []
  const claimed = new Set<Range>()

  for (const line of lines) {
    if (ordered.length >= MAX_INPAGE_NEEDLE_RANGES) {
      break
    }
    let from = 0
    while (from < line.length) {
      if (ordered.length >= MAX_INPAGE_NEEDLE_RANGES) {
        break
      }
      const hit = findRawNeedleInHaystack(line, trimmed, from)
      if (!hit) {
        break
      }
      const start = Math.max(0, hit.index - 48)
      const end = Math.min(line.length, hit.index + hit.length + 48)
      let context = line.slice(start, end).trim()
      if (start > 0) {
        context = `…${context}`
      }
      if (end < line.length) {
        context = `${context}…`
      }
      const range = findRangeByContext(
        context,
        trimmed,
        domRanges.filter((candidate) => !claimed.has(candidate))
      )
      if (range) {
        ordered.push(range)
        claimed.add(range)
      }
      from = hit.index + Math.max(1, hit.length)
    }
  }

  for (const range of domRanges) {
    if (ordered.length >= MAX_INPAGE_NEEDLE_RANGES) {
      break
    }
    if (!claimed.has(range)) {
      ordered.push(range)
    }
  }

  return ordered.length > 0 ? ordered : domRanges
}

function resolveNeedleRanges(needle: string, activeOnly: boolean): Range[] {
  if (activeOnly && sessionNeedle === needle && sessionRanges.length > 0) {
    return sessionRanges
  }
  const ranges = collectNeedleRangesInInnerTextOrder(needle)
  sessionNeedle = needle
  sessionRanges = ranges
  return ranges
}

export type BmxtScrollToSearchNeedleInjectedOptions = {
  persistMs?: number
  globalOccurrenceHint?: number
  highlightColors?: BmxtNeedleHighlightColors
  activeOnly?: boolean
}

export function bmxtScrollToSearchNeedleInjected(
  searchNeedle: string,
  lineNo: number,
  snippetHint: string,
  persistMs = 0,
  globalOccurrenceHint = -1,
  hitBg = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.hitBg,
  jumpBg = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.jumpBg,
  fg = DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS.fg,
  activeOnly = false,
  lineHitIndex = -1
): { ok: boolean } {
  const needle = searchNeedle.trim()
  if (!needle || !document.body) {
    return { ok: false }
  }

  const colors: BmxtNeedleHighlightColors = { hitBg, jumpBg, fg }
  const ranges = resolveNeedleRanges(needle, activeOnly)
  if (ranges.length === 0) {
    return { ok: false }
  }

  const picked = pickRangeForLine(
    ranges,
    lineNo,
    needle,
    snippetHint,
    globalOccurrenceHint,
    lineHitIndex
  )
  if (!picked) {
    return { ok: false }
  }

  return {
    ok: applyBmxtSearchNeedleHighlightSession(ranges, picked, colors, {
      activeOnly,
      persistMs
    })
  }
}
