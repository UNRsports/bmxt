import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  blockIndicesInRange,
  buildTranslateLineRows,
  extractPendingSource,
  lineIndicesInRange,
  listBufferLines,
  reconcileBlocksInBuffer,
  spanForTrimmedSlice,
  splitBufferForBlockHighlight
} from "./translation-segments.ts"

describe("spanForTrimmedSlice", () => {
  it("returns null for whitespace-only slice", () => {
    assert.equal(spanForTrimmedSlice(0, "   "), null)
  })

  it("maps trimmed text back to buffer offsets", () => {
    assert.deepEqual(spanForTrimmedSlice(3, "  abc  "), { start: 5, end: 8 })
  })
})

describe("reconcileBlocksInBuffer", () => {
  it("drops blocks that no longer appear in order", () => {
    const blocks = [
      { source: "A", start: 0, end: 1, forward: "a", back: "A" },
      { source: "B", start: 1, end: 2, forward: "b", back: "B" }
    ]
    assert.deepEqual(reconcileBlocksInBuffer("A X", blocks), [
      { source: "A", start: 0, end: 1, forward: "a", back: "A" }
    ])
  })

  it("refreshes start/end when text is inserted before later blocks", () => {
    const blocks = [{ source: "B", start: 1, end: 2, forward: "b", back: "B" }]
    assert.deepEqual(reconcileBlocksInBuffer("AB", blocks), [
      { source: "B", start: 1, end: 2, forward: "b", back: "B" }
    ])
  })
})

describe("extractPendingSource", () => {
  it("returns trailing untranslated text", () => {
    const blocks = [{ source: "A", start: 0, end: 1 }]
    assert.deepEqual(extractPendingSource("A tail", blocks), {
      source: "tail",
      start: 2,
      end: 6
    })
  })

  it("returns null when everything is committed", () => {
    const blocks = [{ source: "done", start: 0, end: 4 }]
    assert.equal(extractPendingSource("done", blocks), null)
  })
})

describe("blockIndicesInRange", () => {
  const blocks = [
    { start: 0, end: 2 },
    { start: 2, end: 4 }
  ]

  it("returns index for caret inside one block", () => {
    assert.deepEqual(blockIndicesInRange(blocks, 1, 1), [0])
    assert.deepEqual(blockIndicesInRange(blocks, 3, 3), [1])
  })

  it("returns all indices covered by a range", () => {
    assert.deepEqual(blockIndicesInRange(blocks, 0, 3), [0, 1])
  })
})

describe("splitBufferForBlockHighlight", () => {
  it("wraps trailing plain text after blocks", () => {
    assert.deepEqual(splitBufferForBlockHighlight("AB pending", [{ start: 0, end: 2 }]), [
      { kind: "block", index: 0, start: 0, end: 2, text: "AB" },
      { kind: "plain", start: 2, end: 10, text: " pending" }
    ])
  })
})

describe("listBufferLines", () => {
  it("returns one row for text without newlines", () => {
    assert.deepEqual(listBufferLines("abc"), [{ index: 0, start: 0, end: 3 }])
  })

  it("splits on newline characters", () => {
    assert.deepEqual(listBufferLines("a\nb"), [
      { index: 0, start: 0, end: 2 },
      { index: 1, start: 2, end: 3 }
    ])
  })
})

describe("lineIndicesInRange", () => {
  const lines = listBufferLines("a\nb\nc")

  it("returns index for caret on one line", () => {
    assert.deepEqual(lineIndicesInRange(lines, 0, 0), [0])
    assert.deepEqual(lineIndicesInRange(lines, 2, 2), [1])
  })

  it("returns all indices covered by a range", () => {
    assert.deepEqual(lineIndicesInRange(lines, 0, 3), [0, 1])
  })
})

describe("buildTranslateLineRows", () => {
  it("aligns translation rows with source newlines", () => {
    const blocks = [
      {
        source: "a\nb",
        start: 0,
        end: 3,
        forward: "A\nB",
        back: "a\nb"
      }
    ]
    const rows = buildTranslateLineRows("a\nb", blocks, "forward", false)
    assert.equal(rows.length, 2)
    assert.equal(rows[0]!.displayText, "A")
    assert.equal(rows[1]!.displayText, "B")
  })
})
