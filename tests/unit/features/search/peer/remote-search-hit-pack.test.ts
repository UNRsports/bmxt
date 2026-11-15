import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  packRemoteSearchHitsIntoChunks,
  shrinkHitsForSearchWire,
  utf8ByteLength
} from "../../../../../shared/lib/features/search/peer/remote-search-hit-pack.ts"
import {
  SEARCH_WIRE_CHUNK_TARGET_BYTES,
  SEARCH_WIRE_SOFT_CAP_BYTES
} from "../../../../../shared/lib/features/search/peer/remote-search-wire-limits.ts"
import type { SyncRemoteSearchHit } from "../../../../../shared/lib/features/sync/types.ts"

function makeHit(index: number, urlExtra = ""): SyncRemoteSearchHit {
  return {
    index,
    source: "history",
    title: `Title ${index}`,
    url: `https://example.com/path/${index}${urlExtra}`,
    tabId: null,
    hitCount: 1,
    pattern: "x",
    windowId: null
  }
}

describe("remote-search-hit-pack", () => {
  it("clips oversized title and url fields", () => {
    const hit = makeHit(1, `?q=${"a".repeat(2000)}`)
    hit.title = "T".repeat(500)
    const packed = packRemoteSearchHitsIntoChunks([hit])
    assert.ok(packed.length >= 1)
    const first = packed[0]!.hits[0]!
    assert.ok(first.title.length <= 200)
    assert.ok(first.url.length <= 500)
  })

  it("splits many hits into chunks under the soft cap", () => {
    const hits = Array.from({ length: 500 }, (_, i) => makeHit(i + 1, `?pad=${"x".repeat(80)}`))
    const chunks = packRemoteSearchHitsIntoChunks(hits, SEARCH_WIRE_CHUNK_TARGET_BYTES)
    assert.ok(chunks.length > 1)
    assert.equal(chunks[chunks.length - 1]!.eof, true)
    let total = 0
    for (const chunk of chunks) {
      total += chunk.hits.length
      const probe = JSON.stringify({
        type: "search_query_chunk",
        id: "probe",
        replyTo: "probe",
        from: "probe",
        ok: true,
        detail: null,
        seq: chunk.seq,
        eof: chunk.eof,
        hits: chunk.hits
      })
      assert.ok(utf8ByteLength(probe) <= SEARCH_WIRE_SOFT_CAP_BYTES)
    }
    assert.equal(total, hits.length)
  })

  it("shrinkHitsForSearchWire reduces payload under soft cap", () => {
    const hits = Array.from({ length: 400 }, (_, i) =>
      makeHit(i + 1, `?pad=${"y".repeat(400)}`)
    )
    const shrunk = shrinkHitsForSearchWire(hits, SEARCH_WIRE_SOFT_CAP_BYTES)
    assert.ok(shrunk.hits.length < hits.length)
    const probe = JSON.stringify({
      type: "search_query_result",
      id: "probe",
      replyTo: "probe",
      from: "probe",
      ok: true,
      detail: null,
      hits: shrunk.hits
    })
    assert.ok(utf8ByteLength(probe) <= SEARCH_WIRE_SOFT_CAP_BYTES)
  })
})
