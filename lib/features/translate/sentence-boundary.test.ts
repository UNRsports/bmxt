import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { takeNewCompleteSentence } from "./sentence-boundary.ts"

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
