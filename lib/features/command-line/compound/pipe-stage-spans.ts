/**
 * EN: Pipe stage spans for Tab/IME completion (allows empty RHS while typing after `|`).
 * JA: パイプ段の補完用スパン（`|` 直後の空右辺を許容）。
 *
 * Distinct from WASM `parsePipeSegments`, which rejects dangling empty RHS.
 */

export type PipeStageSpan = {
  /** EN: Start index within the compound segment string (inclusive). */
  start: number
  /** EN: End index within the compound segment string (exclusive). */
  end: number
  /** EN: Trimmed stage text (may be empty while typing after `|`). */
  text: string
}

export type ActivePipeStage = {
  stageIndex: number
  stageStart: number
  stageEnd: number
  /** EN: Cursor offset within the active stage substring. */
  localCursor: number
  stageCount: number
}

function pushStageSpan(
  line: string,
  rawStart: number,
  rawEnd: number,
  spans: PipeStageSpan[],
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

/** EN: Length of a top-level `|` (not `||`). */
function matchPipeOperatorLength(line: string, i: number): number {
  if (line[i] !== "|") {
    return 0
  }
  if (i + 1 < line.length && line[i + 1] === "|") {
    return 0
  }
  return 1
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

/**
 * EN: Split a compound segment on `|` for completion; includes empty tail after `|` while typing.
 */
export function scanPipeStageSpans(segmentLine: string): PipeStageSpan[] {
  const spans: PipeStageSpan[] = []
  let stageRawStart = 0
  let i = 0
  const n = segmentLine.length
  let foundPipe = false

  while (i < n) {
    const ch = segmentLine[i]!

    if (ch === "'") {
      const end = readSingleQuotedEnd(segmentLine, i)
      if (end < 0) {
        break
      }
      i = end + 1
      continue
    }

    if (ch === '"') {
      const end = readDoubleQuotedEnd(segmentLine, i)
      if (end < 0) {
        break
      }
      i = end + 1
      continue
    }

    if (ch === "\\" && i + 1 < n && segmentLine[i + 1] === "|") {
      i += 2
      continue
    }

    // EN: `||` is a list operator — skip both bars (not a pipe stage split).
    if (ch === "|" && i + 1 < n && segmentLine[i + 1] === "|") {
      i += 2
      continue
    }

    const opLen = matchPipeOperatorLength(segmentLine, i)
    if (opLen > 0) {
      foundPipe = true
      pushStageSpan(segmentLine, stageRawStart, i, spans, spans.length > 0)
      i += opLen
      stageRawStart = i
      while (stageRawStart < n && segmentLine[stageRawStart] === " ") {
        stageRawStart += 1
      }
      i = stageRawStart
      continue
    }

    i += 1
  }

  pushStageSpan(segmentLine, stageRawStart, n, spans, foundPipe)

  if (spans.length === 0) {
    const trimmed = segmentLine.trim()
    if (trimmed.length === 0) {
      return [{ start: 0, end: segmentLine.length, text: "" }]
    }
    const lead = segmentLine.indexOf(trimmed)
    return [{ start: lead, end: lead + trimmed.length, text: trimmed }]
  }

  return spans
}

/** EN: Pipe stage under the cursor within one compound segment. */
export function resolveActivePipeStage(
  segmentLine: string,
  localCursor: number
): ActivePipeStage {
  const spans = scanPipeStageSpans(segmentLine)
  const clamped = Math.max(0, Math.min(localCursor, segmentLine.length))

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!
    if (clamped >= span.start && clamped <= span.end) {
      return toActivePipeStage(span, index, spans.length, clamped)
    }
    const next = spans[index + 1]
    if (next && clamped > span.end && clamped < next.start) {
      return toActivePipeStage(next, index + 1, spans.length, next.start)
    }
  }

  if (spans.length > 0 && clamped < spans[0]!.start) {
    return toActivePipeStage(spans[0]!, 0, spans.length, clamped)
  }

  const last = spans[spans.length - 1]!
  return toActivePipeStage(last, spans.length - 1, spans.length, clamped)
}

function toActivePipeStage(
  span: PipeStageSpan,
  stageIndex: number,
  stageCount: number,
  cursor: number
): ActivePipeStage {
  const clamped = Math.max(span.start, Math.min(cursor, span.end))
  return {
    stageIndex,
    stageStart: span.start,
    stageEnd: span.end,
    localCursor: clamped - span.start,
    stageCount
  }
}
