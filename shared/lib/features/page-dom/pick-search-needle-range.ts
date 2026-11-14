/**
 * EN: Choose which in-page Range to jump to for a search needle hit.
 *     Prefer snippet / line context over raw globalOccurrence indices — huge DOMs may
 *     keep Ranges in document order while occurrences are counted from innerText.
 * JA: 検索ヒットのジャンプ先 Range を選ぶ。snippet / 行コンテキストを
 *     globalOccurrence 添字より優先（巨大 DOM では順序が食い違うことがある）。
 */

import {
  findRawNeedleInHaystack,
  globalNeedleOccurrenceForLine,
  innerTextLinesFromBodyText
} from "./needle-occurrence.ts"

function innerTextLines(): string[] {
  return innerTextLinesFromBodyText(document.body?.innerText ?? "")
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

export function findRangeByContext(
  context: string,
  needle: string,
  ranges: Range[]
): Range | undefined {
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

/**
 * EN: True when `range` sits in text that still matches `snippetHint` (avoids
 *     trusting a stale/misaligned globalOccurrence index on huge pages).
 * JA: Range 周辺が snippet と一致するか（巨大ページでずれた globalOccurrence を拒否）。
 */
export function rangeAgreesWithSnippetHint(
  range: Range,
  snippetHint: string,
  needle: string
): boolean {
  const hint = snippetHint.replace(/^\s*…/, "").replace(/…\s*$/, "").trim()
  if (!hint) {
    return true
  }
  const around = expandRangeText(range, 160, 160).toLowerCase()
  const hintLower = hint.toLowerCase()
  if (around.includes(hintLower)) {
    return true
  }
  const needleLower = needle.trim().toLowerCase()
  if (needleLower.length > 0) {
    const needleAt = hintLower.indexOf(needleLower)
    if (needleAt >= 0) {
      const probeStart = Math.max(0, needleAt - 12)
      const probeEnd = Math.min(hintLower.length, needleAt + needleLower.length + 24)
      const probe = hintLower.slice(probeStart, probeEnd)
      if (probe.length > needleLower.length && around.includes(probe)) {
        return true
      }
    }
  }
  const shortProbe = hintLower.slice(0, Math.min(28, hintLower.length))
  return shortProbe.length > 0 && around.includes(shortProbe)
}

export function pickRangeForLine(
  ranges: Range[],
  lineNo: number,
  needle: string,
  snippetHint: string,
  globalOccurrenceHint = -1,
  lineHitIndex = -1
): Range | undefined {
  if (ranges.length === 0) {
    return undefined
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
    if (lineHitIndex >= 0) {
      let from = 0
      let hitCount = 0
      while (from < lineText.length) {
        const hit = findRawNeedleInHaystack(lineText, needle, from)
        if (!hit) {
          break
        }
        if (hitCount === lineHitIndex) {
          const context = lineContextAroundNeedle(lineText, needle, 36)
          const byHitOnLine = findRangeByContext(context, needle, ranges)
          if (byHitOnLine) {
            return byHitOnLine
          }
          break
        }
        hitCount += 1
        from = hit.index + Math.max(1, hit.length)
      }
    }
    const context = lineContextAroundNeedle(lineText, needle)
    const byLineContext = findRangeByContext(context, needle, ranges)
    if (byLineContext) {
      return byLineContext
    }
    const occ = globalNeedleOccurrenceForLine(lines, lineNo, needle)
    if (occ >= 0 && occ < ranges.length) {
      const byLineOcc = ranges[occ]!
      if (!hint || rangeAgreesWithSnippetHint(byLineOcc, hint, needle)) {
        return byLineOcc
      }
    }
  }

  if (globalOccurrenceHint >= 0 && globalOccurrenceHint < ranges.length) {
    const byGlobal = ranges[globalOccurrenceHint]!
    if (!hint || rangeAgreesWithSnippetHint(byGlobal, hint, needle)) {
      return byGlobal
    }
  }

  return ranges[0]
}
