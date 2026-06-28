import { lineHasAndOperator } from "./parse-and-segments.ts"

export type CompoundSegmentSpan = {
  /** EN: Start index in the full prompt line (inclusive). */
  start: number
  /** EN: End index in the full prompt line (exclusive). */
  end: number
  /** EN: Trimmed segment command text. */
  text: string
}

export type ActiveCommandSegment = {
  segmentText: string
  segmentStart: number
  /** EN: Exclusive end offset in the full prompt line. */
  segmentEnd: number
  localCursor: number
}

function pushSegmentSpan(
  line: string,
  rawStart: number,
  rawEnd: number,
  spans: CompoundSegmentSpan[],
  allowEmpty: boolean
): void {
  const raw = line.slice(rawStart, rawEnd)
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    if (allowEmpty) {
      spans.push({ start: rawStart, end: rawEnd, text: "" })
    }
    return
  }
  const lead = raw.indexOf(trimmed)
  spans.push({
    start: rawStart + lead,
    end: rawEnd,
    text: trimmed
  })
}

/** EN: Segment spans for completion — includes an empty tail after `&&` while typing. */
export function scanCompoundSegmentSpans(line: string): CompoundSegmentSpan[] {
  const spans: CompoundSegmentSpan[] = []
  let segmentRawStart = 0
  let i = 0
  const n = line.length
  let foundAnd = false

  while (i < n) {
    const ch = line[i]!

    if (ch === "'") {
      const end = readSingleQuotedEnd(line, i)
      if (end < 0) {
        break
      }
      i = end + 1
      continue
    }

    if (ch === '"') {
      const end = readDoubleQuotedEnd(line, i)
      if (end < 0) {
        break
      }
      i = end + 1
      continue
    }

    if (ch === "\\" && i + 2 < n && line[i + 1] === "&" && line[i + 2] === "&") {
      i += 3
      continue
    }

    if (ch === "&" && i + 1 < n && line[i + 1] === "&") {
      foundAnd = true
      pushSegmentSpan(line, segmentRawStart, i, spans, spans.length > 0)
      i += 2
      segmentRawStart = i
      while (segmentRawStart < n && line[segmentRawStart] === " ") {
        segmentRawStart += 1
      }
      i = segmentRawStart
      continue
    }

    i += 1
  }

  pushSegmentSpan(line, segmentRawStart, n, spans, foundAnd)

  if (spans.length === 0) {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      return [{ start: 0, end: line.length, text: "" }]
    }
    const lead = line.indexOf(trimmed)
    return [{ start: lead, end: lead + trimmed.length, text: trimmed }]
  }

  return spans
}

function readSingleQuotedEnd(line: string, start: number): number {
  let i = start + 1
  while (i < line.length) {
    if (line[i] === "'") {
      return i
    }
    i += 1
  }
  return -1
}

function readDoubleQuotedEnd(line: string, start: number): number {
  let i = start + 1
  while (i < line.length) {
    const ch = line[i]!
    if (ch === "\\" && i + 1 < line.length) {
      i += 2
      continue
    }
    if (ch === '"') {
      return i
    }
    i += 1
  }
  return -1
}

/** EN: Segment under the cursor for Tab / IME completion (compound-aware). */
export function resolveActiveCommandSegment(line: string, cursor: number): ActiveCommandSegment {
  const spans = scanCompoundSegmentSpans(line)
  const clampedCursor = Math.max(0, Math.min(cursor, line.length))

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!
    if (clampedCursor >= span.start && clampedCursor <= span.end) {
      return toActiveSegment(span, clampedCursor)
    }
    const next = spans[index + 1]
    if (next && clampedCursor > span.end && clampedCursor < next.start) {
      return toActiveSegment(next, next.start)
    }
  }

  if (spans.length > 0 && clampedCursor < spans[0]!.start) {
    return toActiveSegment(spans[0]!, clampedCursor)
  }

  const last = spans[spans.length - 1]!
  return toActiveSegment(last, clampedCursor)
}

function toActiveSegment(span: CompoundSegmentSpan, cursor: number): ActiveCommandSegment {
  const clamped = Math.max(span.start, Math.min(cursor, span.end))
  return {
    segmentText: span.text,
    segmentStart: span.start,
    segmentEnd: span.end,
    localCursor: clamped - span.start
  }
}

export function isCompoundPromptLine(line: string): boolean {
  return lineHasAndOperator(line)
}

export function mapSegmentOffsetToLine(segmentStart: number, localOffset: number): number {
  return segmentStart + localOffset
}
