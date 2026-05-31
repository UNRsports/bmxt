/** EN: Sentence-ending punctuation that triggers translation after input. */
const SENTENCE_END_RE = /[。．.!?！？]/

/**
 * EN: From `buffer[offset…]`, return the first complete sentence (through closing punctuation).
 */
export function takeNewCompleteSentence(
  buffer: string,
  offset: number
): { sentence: string; end: number } | null {
  if (offset < 0 || offset > buffer.length) {
    return null
  }
  const slice = buffer.slice(offset)
  let endInSlice = -1
  for (let i = 0; i < slice.length; i++) {
    if (SENTENCE_END_RE.test(slice[i]!)) {
      endInSlice = i + 1
      break
    }
  }
  if (endInSlice < 0) {
    return null
  }
  let tail = endInSlice
  while (tail < slice.length && /\s/.test(slice[tail]!)) {
    tail++
  }
  const raw = slice.slice(0, endInSlice).trim()
  if (!raw) {
    return null
  }
  return { sentence: raw, end: offset + tail }
}

/** EN: All complete sentences in `buffer` (in order). */
export function listCompleteSentences(buffer: string): readonly string[] {
  const sentences: string[] = []
  let offset = 0
  for (;;) {
    const found = takeNewCompleteSentence(buffer, offset)
    if (!found) {
      break
    }
    sentences.push(found.sentence)
    offset = found.end
  }
  return sentences
}

export type SentenceSpan = {
  index: number
  start: number
  end: number
}

/** EN: Buffer ranges for each complete sentence (in order). */
export function listCompleteSentenceSpans(buffer: string): readonly SentenceSpan[] {
  const spans: SentenceSpan[] = []
  let offset = 0
  let index = 0
  for (;;) {
    const found = takeNewCompleteSentence(buffer, offset)
    if (!found) {
      break
    }
    spans.push({ index: index++, start: offset, end: found.end })
    offset = found.end
  }
  return spans
}

export type BufferSegment =
  | { kind: "sentence"; index: number; start: number; end: number; text: string }
  | { kind: "plain"; start: number; end: number; text: string }

/** EN: Split buffer into plain gaps and complete sentence spans for mirror rendering. */
export function splitBufferForHighlight(buffer: string): readonly BufferSegment[] {
  const spans = listCompleteSentenceSpans(buffer)
  if (spans.length === 0) {
    if (buffer.length === 0) {
      return []
    }
    return [{ kind: "plain", start: 0, end: buffer.length, text: buffer }]
  }

  const segments: BufferSegment[] = []
  let pos = 0
  for (const span of spans) {
    if (span.start > pos) {
      segments.push({
        kind: "plain",
        start: pos,
        end: span.start,
        text: buffer.slice(pos, span.start)
      })
    }
    segments.push({
      kind: "sentence",
      index: span.index,
      start: span.start,
      end: span.end,
      text: buffer.slice(span.start, span.end)
    })
    pos = span.end
  }
  if (pos < buffer.length) {
    segments.push({ kind: "plain", start: pos, end: buffer.length, text: buffer.slice(pos) })
  }
  return segments
}

/** EN: Sentence indices touched by a selection range in the source buffer. */
export function sentenceIndicesInRange(
  spans: readonly SentenceSpan[],
  selStart: number,
  selEnd: number
): readonly number[] {
  if (spans.length === 0) {
    return []
  }
  if (selStart === selEnd) {
    for (const span of spans) {
      if (selStart >= span.start && selStart < span.end) {
        return [span.index]
      }
    }
    return []
  }
  const lo = Math.min(selStart, selEnd)
  const hi = Math.max(selStart, selEnd)
  const indices: number[] = []
  for (const span of spans) {
    if (span.end > lo && span.start < hi) {
      indices.push(span.index)
    }
  }
  return indices
}
