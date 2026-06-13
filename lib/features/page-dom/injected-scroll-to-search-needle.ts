/**
 * EN: Injected via content script or `chrome.scripting.executeScript` — scroll to a
 *     search needle and highlight it in-page. Ranges are ordered by innerText global
 *     occurrence; pick order: indexed globalOccurrence → snippet → line context → first.
 * JA: 検索語へスクロールして強調表示。Range は innerText 出現順。選択は
 *     globalOccurrence → snippet → 行コンテキスト → 先頭一致。
 */

import {
  applyBmxtSearchNeedleHighlightSession,
  DEFAULT_BMXT_NEEDLE_HIGHLIGHT_COLORS,
  type BmxtNeedleHighlightColors
} from "./injected-needle-highlight"
import {
  findRawNeedleInHaystack,
  globalNeedleOccurrenceForLine,
  innerTextLinesFromBodyText
} from "./needle-occurrence"

let sessionNeedle = ""
let sessionRanges: Range[] = []

/** EN: Reset cached ranges (detail picker closed or pattern changed). */
export function resetBmxtSearchNeedleSession(): void {
  sessionNeedle = ""
  sessionRanges = []
}

function innerTextLines(): string[] {
  return innerTextLinesFromBodyText(document.body?.innerText ?? "")
}

function collectNeedleRanges(needle: string): Range[] {
  const trimmed = needle.trim()
  if (!trimmed || !document.body) {
    return []
  }
  const ranges: Range[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? ""
    let from = 0
    while (from < text.length) {
      const hit = findRawNeedleInHaystack(text, trimmed, from)
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
  return ranges
}

function collectNeedleRangesInInnerTextOrder(needle: string): Range[] {
  const trimmed = needle.trim()
  if (!trimmed || !document.body) {
    return []
  }
  const domRanges = collectNeedleRanges(trimmed)
  if (domRanges.length === 0) {
    return []
  }

  const lines = innerTextLines()
  const ordered: Range[] = []
  const claimed = new Set<Range>()

  for (const line of lines) {
    let from = 0
    while (from < line.length) {
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

function lineContextAroundNeedle(line: string, needle: string, context = 36): string {
  const trimmed = line.trim()
  if (!trimmed) {
    return ""
  }
  const hit = findRawNeedleInHaystack(trimmed, needle)
  if (!hit) {
    return trimmed.slice(0, Math.min(96, trimmed.length))
  }
  const start = Math.max(0, hit.index - context)
  const end = Math.min(trimmed.length, hit.index + hit.length + context)
  return trimmed.slice(start, end)
}

function expandRangeText(range: Range, before = 64, after = 64): string {
  try {
    const pre = document.createRange()
    pre.selectNodeContents(document.body!)
    pre.setEnd(range.startContainer, range.startOffset)
    const post = document.createRange()
    post.setStart(range.endContainer, range.endOffset)
    post.selectNodeContents(document.body!)
    const beforeText = pre.toString()
    const afterText = post.toString()
    return (
      beforeText.slice(Math.max(0, beforeText.length - before)) +
      range.toString() +
      afterText.slice(0, after)
    )
  } catch {
    return range.toString()
  }
}

function findRangeByContext(context: string, needle: string, ranges: Range[]): Range | undefined {
  const ctx = context.trim()
  if (!ctx || !document.body) {
    return undefined
  }
  const ctxLower = ctx.toLowerCase()
  const needleLower = needle.toLowerCase()
  let best: Range | undefined
  let bestScore = -1
  for (const range of ranges) {
    const around = expandRangeText(range, 120, 120).toLowerCase()
    if (!around.includes(needleLower)) {
      continue
    }
    let score = 0
    if (around.includes(ctxLower)) {
      score += ctxLower.length
    } else {
      const probe = ctxLower.slice(0, Math.min(24, ctxLower.length))
      if (probe.length > 0 && around.includes(probe)) {
        score += probe.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = range
    }
  }
  return best
}

function pickRangeForLine(
  ranges: Range[],
  lineNo: number,
  needle: string,
  snippetHint: string,
  globalOccurrenceHint = -1
): Range | undefined {
  if (ranges.length === 0) {
    return undefined
  }

  if (globalOccurrenceHint >= 0 && globalOccurrenceHint < ranges.length) {
    return ranges[globalOccurrenceHint]
  }

  const hint = snippetHint.replace(/^\s*…/, "").replace(/…\s*$/, "").trim()
  if (hint) {
    const byHint = findRangeByContext(hint, needle, ranges)
    if (byHint) {
      return byHint
    }
  }

  const lines = innerTextLines()
  if (lineNo > 0 && lineNo <= lines.length) {
    const lineText = lines[lineNo - 1]!
    const context = lineContextAroundNeedle(lineText, needle)
    const byLineContext = findRangeByContext(context, needle, ranges)
    if (byLineContext) {
      return byLineContext
    }
    const occ = globalNeedleOccurrenceForLine(lines, lineNo, needle)
    if (occ >= 0 && occ < ranges.length) {
      return ranges[occ]
    }
  }

  return ranges[0]
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
  activeOnly = false
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
    globalOccurrenceHint
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
