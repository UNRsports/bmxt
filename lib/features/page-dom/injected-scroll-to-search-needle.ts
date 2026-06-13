/**
 * EN: Injected via content script or `chrome.scripting.executeScript` — scroll to a
 *     search needle on a specific innerText line and highlight it in-page.
 * JA: innerText 行番号を手がかりに検索語へスクロールし、ページ内で強調表示する。
 */

import {
  applyBmxtNeedleHighlight,
  DEFAULT_NEEDLE_HIGHLIGHT_MS
} from "./injected-needle-highlight"
import {
  globalNeedleOccurrenceForLine,
  innerTextLinesFromBodyText
} from "./needle-occurrence"

function innerTextLines(): string[] {
  return innerTextLinesFromBodyText(document.body?.innerText ?? "")
}

function collectNeedleRanges(needle: string): Range[] {
  const trimmed = needle.trim()
  if (!trimmed || !document.body) {
    return []
  }
  const needleLower = trimmed.toLowerCase()
  const ranges: Range[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) {
    const text = node.textContent ?? ""
    let from = 0
    while (from < text.length) {
      const idx = text.toLowerCase().indexOf(needleLower, from)
      if (idx < 0) {
        break
      }
      const range = document.createRange()
      range.setStart(node, idx)
      range.setEnd(node, Math.min(idx + trimmed.length, text.length))
      ranges.push(range)
      from = idx + Math.max(1, trimmed.length)
    }
  }
  return ranges
}

function lineContextAroundNeedle(line: string, needle: string, context = 36): string {
  const trimmed = line.trim()
  if (!trimmed) {
    return ""
  }
  const idx = trimmed.toLowerCase().indexOf(needle.toLowerCase())
  if (idx < 0) {
    return trimmed.slice(0, Math.min(96, trimmed.length))
  }
  const start = Math.max(0, idx - context)
  const end = Math.min(trimmed.length, idx + needle.length + context)
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

function findRangeByContext(context: string, needle: string): Range | undefined {
  const ctx = context.trim()
  if (!ctx || !document.body) {
    return undefined
  }
  const ctxLower = ctx.toLowerCase()
  const needleLower = needle.toLowerCase()
  const ranges = collectNeedleRanges(needle)
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

  const hint = snippetHint.replace(/…\s*$/, "").trim()
  if (hint) {
    const byHint = findRangeByContext(hint, needle)
    if (byHint) {
      return byHint
    }
  }

  const lines = innerTextLines()
  if (lineNo > 0 && lineNo <= lines.length) {
    const lineText = lines[lineNo - 1]!
    const occ = globalNeedleOccurrenceForLine(lines, lineNo, needle)
    if (occ >= 0 && occ < ranges.length) {
      return ranges[occ]
    }
    const context = lineContextAroundNeedle(lineText, needle)
    const byContext = findRangeByContext(context, needle)
    if (byContext) {
      return byContext
    }
  }

  return ranges[0]
}

export function bmxtScrollToSearchNeedleInjected(
  searchNeedle: string,
  lineNo: number,
  snippetHint: string,
  persistMs = DEFAULT_NEEDLE_HIGHLIGHT_MS,
  globalOccurrenceHint = -1
): { ok: boolean } {
  const needle = searchNeedle.trim()
  if (!needle || !document.body) {
    return { ok: false }
  }

  const ranges = collectNeedleRanges(needle)
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

  return { ok: applyBmxtNeedleHighlight(picked, persistMs) }
}
