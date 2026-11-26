import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DOM_REMOTE_SINGLE_RESULT_MAX_LINES,
  packRemoteDomLinesIntoChunks,
  shrinkLinesForDomWire,
  utf8ByteLength
} from "../../../../shared/lib/features/dom/remote-dom-list-wire.ts"
import { SEARCH_WIRE_CHUNK_TARGET_BYTES } from "../../../../shared/lib/features/search/peer/remote-search-wire-limits.ts"

describe("remote-dom-list-wire", () => {
  it("packs empty lines as a single eof chunk", () => {
    const chunks = packRemoteDomLinesIntoChunks([])
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0]!.eof, true)
    assert.deepEqual(chunks[0]!.lines, [])
  })

  it("keeps a small tree in one chunk under the target", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `  `.repeat(i % 4) + `<div id="n${i}">`)
    const chunks = packRemoteDomLinesIntoChunks(lines)
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0]!.eof, true)
    assert.equal(chunks[0]!.lines.length, 20)
    assert.ok(chunks[0]!.lines.length <= DOM_REMOTE_SINGLE_RESULT_MAX_LINES)
  })

  it("splits a large line set into multiple chunks under the byte target", () => {
    const lines = Array.from({ length: 2_000 }, (_, i) => {
      const pad = "x".repeat(80)
      return `<div id="row-${i}" class="a b c">${pad}`
    })
    const chunks = packRemoteDomLinesIntoChunks(lines)
    assert.ok(chunks.length > 1, `expected multiple chunks, got ${chunks.length}`)
    assert.equal(chunks[chunks.length - 1]!.eof, true)
    let total = 0
    for (const chunk of chunks) {
      total += chunk.lines.length
      const probe = JSON.stringify({
        type: "dom_list_chunk",
        id: "probe",
        replyTo: "probe",
        from: "probe",
        ok: true,
        detail: null,
        seq: chunk.seq,
        eof: chunk.eof,
        lines: chunk.lines
      })
      assert.ok(
        utf8ByteLength(probe) <= SEARCH_WIRE_CHUNK_TARGET_BYTES * 1.25,
        `chunk ${chunk.seq} too large: ${utf8ByteLength(probe)}`
      )
    }
    assert.equal(total, 2_000)
  })

  it("shrinkLinesForDomWire trims oversized single-result payloads", () => {
    const lines = Array.from({ length: 5_000 }, (_, i) => `<div id="${i}">${"y".repeat(100)}`)
    const shrunk = shrinkLinesForDomWire(lines)
    assert.equal(shrunk.truncated, true)
    assert.ok(shrunk.lines.length < lines.length)
  })
})
