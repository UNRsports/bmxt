import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listCompleteSentences,
  listCompleteSentenceSpans,
  sentenceIndicesInRange,
  splitBufferForHighlight,
  takeNewCompleteSentence
} from "./sentence-boundary.ts"

describe("takeNewCompleteSentence", () => {
  it("returns null when no closing punctuation", () => {
    assert.equal(takeNewCompleteSentence("今日は良い", 0), null)
  })

  it("detects Japanese period", () => {
    assert.deepEqual(takeNewCompleteSentence("今日は良い天気です。続き", 0), {
      sentence: "今日は良い天気です。",
      end: 10
    })
  })

  it("continues from offset after prior sentence", () => {
    const buf = "A。B。"
    assert.deepEqual(takeNewCompleteSentence(buf, 2), { sentence: "B。", end: 4 })
  })
})

describe("listCompleteSentences", () => {
  it("returns empty for incomplete text", () => {
    assert.deepEqual(listCompleteSentences("今日は良い"), [])
  })

  it("returns all complete sentences in order", () => {
    assert.deepEqual(listCompleteSentences("A。B。未完"), ["A。", "B。"])
  })
})

describe("listCompleteSentenceSpans", () => {
  it("returns buffer ranges for each sentence", () => {
    const buf = "A。B。"
    assert.deepEqual(listCompleteSentenceSpans(buf), [
      { index: 0, start: 0, end: 2 },
      { index: 1, start: 2, end: 4 }
    ])
  })
})

describe("sentenceIndicesInRange", () => {
  const spans = listCompleteSentenceSpans("A。B。C。")

  it("returns index for caret inside one sentence", () => {
    assert.deepEqual(sentenceIndicesInRange(spans, 1, 1), [0])
    assert.deepEqual(sentenceIndicesInRange(spans, 3, 3), [1])
  })

  it("returns all indices covered by a range", () => {
    assert.deepEqual(sentenceIndicesInRange(spans, 0, 3), [0, 1])
  })
})

describe("splitBufferForHighlight", () => {
  it("wraps trailing incomplete text as plain", () => {
    assert.deepEqual(splitBufferForHighlight("A。未完"), [
      { kind: "sentence", index: 0, start: 0, end: 2, text: "A。" },
      { kind: "plain", start: 2, end: 4, text: "未完" }
    ])
  })
})
