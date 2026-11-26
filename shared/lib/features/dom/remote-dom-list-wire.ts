/**
 * EN: Pack DOM capture lines into DataChannel-sized chunks (search wire parity).
 * JA: DOM 取得行を DataChannel サイズのチャンクへ分割（search wire と揃える）。
 */

import {
  SEARCH_WIRE_CHUNK_TARGET_BYTES,
  SEARCH_WIRE_SOFT_CAP_BYTES
} from "../search/peer/remote-search-wire-limits.ts"

/** EN: Soft cap for one line on the wire (open-tag rows are short; defense for leftovers). */
export const DOM_REMOTE_LINE_MAX_CHARS = 500

/** EN: Prefer single `dom_list_result` when at most this many lines and one chunk. */
export const DOM_REMOTE_SINGLE_RESULT_MAX_LINES = 80

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function clipDomWireLine(line: string): string {
  if (line.length <= DOM_REMOTE_LINE_MAX_CHARS) {
    return line
  }
  return `${line.slice(0, DOM_REMOTE_LINE_MAX_CHARS - 1)}…`
}

export function clipDomWireLines(lines: readonly string[]): string[] {
  return lines.map(clipDomWireLine)
}

type DomListResultEnvelope = {
  type: "dom_list_result"
  id: string
  replyTo: string
  from: string
  ok: boolean
  detail: string | null
  lines: string[]
}

type DomListChunkEnvelope = {
  type: "dom_list_chunk"
  id: string
  replyTo: string
  from: string
  ok: boolean
  detail: string | null
  seq: number
  eof: boolean
  lines: string[]
}

function resultProbeBytes(lines: string[]): number {
  const probe: DomListResultEnvelope = {
    type: "dom_list_result",
    id: "probe",
    replyTo: "probe",
    from: "probe",
    ok: true,
    detail: null,
    lines
  }
  return utf8ByteLength(JSON.stringify(probe))
}

function chunkProbeBytes(lines: string[], seq: number, eof: boolean): number {
  const probe: DomListChunkEnvelope = {
    type: "dom_list_chunk",
    id: "probe",
    replyTo: "probe",
    from: "probe",
    ok: true,
    detail: null,
    seq,
    eof,
    lines
  }
  return utf8ByteLength(JSON.stringify(probe))
}

/**
 * EN: Shrink a single-message `dom_list_result` under the soft cap.
 * JA: 単発 `dom_list_result` を soft cap 以下に収める。
 */
export function shrinkLinesForDomWire(
  lines: readonly string[],
  softCapBytes: number = SEARCH_WIRE_SOFT_CAP_BYTES
): { lines: string[]; truncated: boolean; detailSuffix: string | null } {
  let next = clipDomWireLines(lines)
  let truncated = next.length < lines.length

  while (next.length > 0 && resultProbeBytes(next) > softCapBytes) {
    truncated = true
    const drop = Math.max(1, Math.ceil(next.length * 0.1))
    next = next.slice(0, Math.max(0, next.length - drop))
  }

  if (next.length === 0 && lines.length > 0) {
    return {
      lines: [],
      truncated: true,
      detailSuffix: "truncated_wire"
    }
  }

  return {
    lines: next,
    truncated,
    detailSuffix: truncated ? "truncated_wire" : null
  }
}

export type RemoteDomWireChunk = {
  seq: number
  eof: boolean
  lines: string[]
}

/**
 * EN: Split lines into ordered chunks each under the chunk UTF-8 target.
 * JA: 行をチャンク UTF-8 目標以下の順序付き断片に分割する。
 */
export function packRemoteDomLinesIntoChunks(
  lines: readonly string[],
  targetBytes: number = SEARCH_WIRE_CHUNK_TARGET_BYTES
): RemoteDomWireChunk[] {
  const clipped = clipDomWireLines(lines)
  if (clipped.length === 0) {
    return [{ seq: 0, eof: true, lines: [] }]
  }

  const chunks: RemoteDomWireChunk[] = []
  let offset = 0
  let seq = 0

  while (offset < clipped.length) {
    let low = 1
    let high = clipped.length - offset
    let best = 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const slice = clipped.slice(offset, offset + mid)
      const eof = offset + mid >= clipped.length
      if (chunkProbeBytes(slice, seq, eof) <= targetBytes) {
        best = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    const take = Math.max(1, best)
    let slice = clipped.slice(offset, offset + take)
    offset += take
    const eof = offset >= clipped.length
    if (chunkProbeBytes(slice, seq, eof) > SEARCH_WIRE_SOFT_CAP_BYTES) {
      slice = slice.map((line) =>
        line.length > 120 ? `${line.slice(0, 119)}…` : line
      )
      if (chunkProbeBytes(slice, seq, eof) > SEARCH_WIRE_SOFT_CAP_BYTES) {
        slice = []
      }
    }
    chunks.push({ seq, eof, lines: slice })
    seq += 1
  }

  if (chunks.length === 0) {
    return [{ seq: 0, eof: true, lines: [] }]
  }
  const last = chunks[chunks.length - 1]!
  if (!last.eof) {
    chunks[chunks.length - 1] = { ...last, eof: true }
  }
  return chunks
}
