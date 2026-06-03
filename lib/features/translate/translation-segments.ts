/** EN: Buffer span for one translated segment (debounced pause unit). */
export type BlockSpan = {
  start: number
  end: number
}

export type PendingSegment = BlockSpan & {
  source: string
}

/** EN: Return trimmed source span within `slice` starting at `sliceStart`. */
export function spanForTrimmedSlice(sliceStart: number, slice: string): BlockSpan | null {
  const source = slice.trim()
  if (!source) {
    return null
  }
  const lead = slice.length - slice.trimStart().length
  const start = sliceStart + lead
  return { start, end: start + source.length }
}

/** EN: Keep blocks whose source still appears in order; refresh start/end. */
export function reconcileBlocksInBuffer<T extends { source: string; start: number; end: number }>(
  buffer: string,
  blocks: readonly T[]
): T[] {
  const matched: T[] = []
  let searchFrom = 0
  for (const block of blocks) {
    const idx = buffer.indexOf(block.source, searchFrom)
    if (idx < 0) {
      break
    }
    const start = idx
    const end = idx + block.source.length
    if (buffer.slice(start, end) !== block.source) {
      break
    }
    matched.push({ ...block, start, end })
    searchFrom = end
  }
  return matched
}

/** EN: Buffer index where the next debounced segment would begin. */
export function pendingSliceStart(blocks: readonly BlockSpan[]): number {
  if (blocks.length === 0) {
    return 0
  }
  return blocks[blocks.length - 1]!.end
}

/** EN: Untranslated trailing text after committed blocks. */
export function extractPendingSource(
  buffer: string,
  blocks: readonly BlockSpan[]
): PendingSegment | null {
  const sliceStart = pendingSliceStart(blocks)
  const slice = buffer.slice(sliceStart)
  const span = spanForTrimmedSlice(sliceStart, slice)
  if (!span) {
    return null
  }
  const source = buffer.slice(span.start, span.end)
  return { source, start: span.start, end: span.end }
}

/** EN: Block indices overlapping a textarea selection range. */
export function blockIndicesInRange(
  blocks: readonly BlockSpan[],
  selStart: number,
  selEnd: number
): readonly number[] {
  if (blocks.length === 0) {
    return []
  }
  if (selStart === selEnd) {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]!
      if (selStart >= block.start && selStart < block.end) {
        return [index]
      }
    }
    return []
  }
  const lo = Math.min(selStart, selEnd)
  const hi = Math.max(selStart, selEnd)
  const indices: number[] = []
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!
    if (block.end > lo && block.start < hi) {
      indices.push(index)
    }
  }
  return indices
}

export type BufferSegment =
  | { kind: "block"; index: number; start: number; end: number; text: string }
  | { kind: "plain"; start: number; end: number; text: string }

/** EN: Split buffer into translated block spans and plain gaps for mirror highlight. */
export function splitBufferForBlockHighlight(
  buffer: string,
  blocks: readonly BlockSpan[]
): readonly BufferSegment[] {
  if (blocks.length === 0) {
    if (buffer.length === 0) {
      return []
    }
    return [{ kind: "plain", start: 0, end: buffer.length, text: buffer }]
  }

  const segments: BufferSegment[] = []
  let pos = 0
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!
    if (block.start > pos) {
      segments.push({
        kind: "plain",
        start: pos,
        end: block.start,
        text: buffer.slice(pos, block.start)
      })
    }
    segments.push({
      kind: "block",
      index,
      start: block.start,
      end: block.end,
      text: buffer.slice(block.start, block.end)
    })
    pos = block.end
  }
  if (pos < buffer.length) {
    segments.push({ kind: "plain", start: pos, end: buffer.length, text: buffer.slice(pos) })
  }
  return segments
}

export function pendingSegmentKey(segment: PendingSegment): string {
  return `${segment.start}\0${segment.end}\0${segment.source}`
}

export type LineSpan = {
  index: number
  start: number
  end: number
}

/** EN: One row per newline-delimited line (`end` includes the trailing `\n` when present). */
export function listBufferLines(buffer: string): readonly LineSpan[] {
  if (buffer.length === 0) {
    return []
  }
  const lines: LineSpan[] = []
  let index = 0
  let lineStart = 0
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === "\n") {
      lines.push({ index: index++, start: lineStart, end: i + 1 })
      lineStart = i + 1
    }
  }
  lines.push({ index: index++, start: lineStart, end: buffer.length })
  return lines
}

/** EN: Textarea selection range for one buffer line (excludes trailing `\n`). */
export function lineSelectionRange(
  line: LineSpan,
  buffer: string
): { start: number; end: number } {
  let end = line.end
  if (end > line.start && buffer[end - 1] === "\n") {
    end -= 1
  }
  return { start: line.start, end }
}

/** EN: Line indices overlapping a textarea selection range. */
export function lineIndicesInRange(
  lines: readonly LineSpan[],
  selStart: number,
  selEnd: number
): readonly number[] {
  if (lines.length === 0) {
    return []
  }
  if (selStart === selEnd) {
    for (const line of lines) {
      if (selStart >= line.start && selStart < line.end) {
        return [line.index]
      }
    }
    return []
  }
  const lo = Math.min(selStart, selEnd)
  const hi = Math.max(selStart, selEnd)
  const indices: number[] = []
  for (const line of lines) {
    if (line.end > lo && line.start < hi) {
      indices.push(line.index)
    }
  }
  return indices
}

/** EN: Zero-based line index inside a block's `source` for a buffer offset. */
export function lineIndexInBlockSource(
  block: { source: string; start: number },
  lineStart: number
): number {
  const offsetInBlock = lineStart - block.start
  let lineIndex = 0
  for (let i = 0; i < offsetInBlock && i < block.source.length; i++) {
    if (block.source[i] === "\n") {
      lineIndex++
    }
  }
  return lineIndex
}

export type TranslateLineRow = {
  lineIndex: number
  start: number
  end: number
  displayText: string
  pending: boolean
}

function fieldLineAt(text: string, lineIndex: number): string {
  const parts = text.split("\n")
  return parts[lineIndex] ?? ""
}

export const TRANSLATE_PENDING_TEXT = "…"

/**
 * EN: Resolve forward translation text for display (full-buffer re-translate model).
 * JA: 全文再翻訳モデル向けの訳文表示。100ms 超の処理中は "…"、それ以外は確定訳または直前の訳（stale）。
 */
export function resolveForwardDisplayText(
  buffer: string,
  blocks: readonly { source: string; forward: string }[],
  busy: boolean,
  showPending: boolean
): string {
  if (buffer.length === 0) {
    return ""
  }
  if (busy && showPending) {
    return TRANSLATE_PENDING_TEXT
  }
  const block = blocks[0]
  if (!block?.forward) {
    return ""
  }
  if (block.source === buffer || !busy) {
    return block.forward
  }
  return block.forward
}

/**
 * EN: Build forward display for nav typing — one full-buffer translation per pause.
 */
export function assembleTranslationFieldForBuffer(
  buffer: string,
  blocks: readonly { source: string; forward: string }[],
  busy: boolean,
  showPending: boolean
): string {
  return resolveForwardDisplayText(buffer, blocks, busy, showPending)
}

/** EN: One display row per source line with aligned translation field text. */
export function buildTranslateLineRows(
  buffer: string,
  blocks: readonly { source: string; start: number; end: number; forward: string }[],
  busy: boolean,
  showPending: boolean
): readonly TranslateLineRow[] {
  const lines = listBufferLines(buffer)
  if (lines.length === 0) {
    return []
  }
  if (busy && showPending) {
    return lines.map((line) => ({
      lineIndex: line.index,
      start: line.start,
      end: line.end,
      displayText: TRANSLATE_PENDING_TEXT,
      pending: true
    }))
  }

  const block = blocks[0]
  if (!block?.forward) {
    return lines.map((line) => ({
      lineIndex: line.index,
      start: line.start,
      end: line.end,
      displayText: "",
      pending: busy
    }))
  }

  const stale = block.source !== buffer
  return lines.map((line) => {
    if (stale && line.start >= block.end) {
      return {
        lineIndex: line.index,
        start: line.start,
        end: line.end,
        displayText: "",
        pending: busy
      }
    }
    const anchor = stale ? Math.min(line.start, Math.max(block.start, block.end - 1)) : line.start
    const lineInBlock = lineIndexInBlockSource(block, anchor)
    return {
      lineIndex: line.index,
      start: line.start,
      end: line.end,
      displayText: fieldLineAt(block.forward, lineInBlock),
      pending: busy && stale
    }
  })
}
