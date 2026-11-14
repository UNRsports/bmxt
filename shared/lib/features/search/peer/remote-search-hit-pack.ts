import type { SyncRemoteSearchHit } from "../../sync/types.ts"
import {
  SEARCH_REMOTE_TITLE_MAX_CHARS,
  SEARCH_REMOTE_URL_MAX_CHARS,
  SEARCH_WIRE_CHUNK_TARGET_BYTES,
  SEARCH_WIRE_SOFT_CAP_BYTES
} from "./remote-search-wire-limits.ts"

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function clipRemoteSearchHitFields(hit: SyncRemoteSearchHit): SyncRemoteSearchHit {
  const title =
    hit.title.length > SEARCH_REMOTE_TITLE_MAX_CHARS
      ? `${hit.title.slice(0, SEARCH_REMOTE_TITLE_MAX_CHARS - 1)}…`
      : hit.title
  const url =
    hit.url.length > SEARCH_REMOTE_URL_MAX_CHARS
      ? hit.url.slice(0, SEARCH_REMOTE_URL_MAX_CHARS)
      : hit.url
  return {
    ...hit,
    title,
    url
  }
}

export function clipRemoteSearchHits(
  hits: readonly SyncRemoteSearchHit[]
): SyncRemoteSearchHit[] {
  return hits.map(clipRemoteSearchHitFields)
}

type SearchQueryResultEnvelope = {
  type: "search_query_result"
  id: string
  replyTo: string
  from: string
  ok: boolean
  detail: string | null
  hits: SyncRemoteSearchHit[]
}

type SearchQueryChunkEnvelope = {
  type: "search_query_chunk"
  id: string
  replyTo: string
  from: string
  ok: boolean
  detail: string | null
  seq: number
  eof: boolean
  hits: SyncRemoteSearchHit[]
}

function resultProbeBytes(hits: SyncRemoteSearchHit[]): number {
  const probe: SearchQueryResultEnvelope = {
    type: "search_query_result",
    id: "probe",
    replyTo: "probe",
    from: "probe",
    ok: true,
    detail: null,
    hits
  }
  return utf8ByteLength(JSON.stringify(probe))
}

function chunkProbeBytes(hits: SyncRemoteSearchHit[], seq: number, eof: boolean): number {
  const probe: SearchQueryChunkEnvelope = {
    type: "search_query_chunk",
    id: "probe",
    replyTo: "probe",
    from: "probe",
    ok: true,
    detail: null,
    seq,
    eof,
    hits
  }
  return utf8ByteLength(JSON.stringify(probe))
}

/**
 * EN: Shrink a single-message search_query_result payload under the soft cap.
 * JA: 単発 search_query_result を soft cap 以下に収める。
 */
export function shrinkHitsForSearchWire(
  hits: readonly SyncRemoteSearchHit[],
  softCapBytes: number = SEARCH_WIRE_SOFT_CAP_BYTES
): { hits: SyncRemoteSearchHit[]; truncated: boolean; detailSuffix: string | null } {
  let next = clipRemoteSearchHits(hits)
  let truncated = next.length < hits.length

  while (next.length > 0 && resultProbeBytes(next) > softCapBytes) {
    truncated = true
    const drop = Math.max(1, Math.ceil(next.length * 0.1))
    next = next.slice(0, Math.max(0, next.length - drop))
  }

  if (next.length === 0 && hits.length > 0) {
    return {
      hits: [],
      truncated: true,
      detailSuffix: "truncated_wire"
    }
  }

  return {
    hits: next,
    truncated,
    detailSuffix: truncated ? "truncated_wire" : null
  }
}

export type RemoteSearchWireChunk = {
  seq: number
  eof: boolean
  hits: SyncRemoteSearchHit[]
}

/**
 * EN: Split hits into ordered chunks each under the chunk UTF-8 target.
 * JA: ヒットをチャンク UTF-8 目標以下の順序付き断片に分割する。
 */
export function packRemoteSearchHitsIntoChunks(
  hits: readonly SyncRemoteSearchHit[],
  targetBytes: number = SEARCH_WIRE_CHUNK_TARGET_BYTES
): RemoteSearchWireChunk[] {
  const clipped = clipRemoteSearchHits(hits)
  if (clipped.length === 0) {
    return [{ seq: 0, eof: true, hits: [] }]
  }

  const chunks: RemoteSearchWireChunk[] = []
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

    // EN: Even one hit may exceed target — still send a single clipped hit.
    const take = Math.max(1, best)
    const slice = clipped.slice(offset, offset + take)
    offset += take
    const eof = offset >= clipped.length
    // EN: If a singleton still exceeds soft cap, drop fields further by emptying url query.
    let finalSlice = slice
    if (chunkProbeBytes(finalSlice, seq, eof) > SEARCH_WIRE_SOFT_CAP_BYTES) {
      finalSlice = finalSlice.map((h) => ({
        ...h,
        title: h.title.slice(0, 80),
        url: h.url.slice(0, 200)
      }))
      if (chunkProbeBytes(finalSlice, seq, eof) > SEARCH_WIRE_SOFT_CAP_BYTES) {
        finalSlice = []
      }
    }
    chunks.push({ seq, eof, hits: finalSlice })
    seq += 1
  }

  if (chunks.length === 0) {
    return [{ seq: 0, eof: true, hits: [] }]
  }
  const last = chunks[chunks.length - 1]!
  if (!last.eof) {
    chunks[chunks.length - 1] = { ...last, eof: true }
  }
  return chunks
}
