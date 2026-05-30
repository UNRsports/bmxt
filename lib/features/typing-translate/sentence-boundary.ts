/** EN: Sentence-ending punctuation that triggers translation after nav typing input. */
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
