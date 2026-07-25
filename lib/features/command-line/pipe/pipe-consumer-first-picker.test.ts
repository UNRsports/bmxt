import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isCompletePipeConsumerWithoutFurtherTokens,
  suppressExactCompletePipeConsumerFirstPicker
} from "./pipe-consumer-first-picker.ts"

describe("suppressExactCompletePipeConsumerFirstPicker", () => {
  it("returns null when browse is already complete", () => {
    const stage = "browse"
    const hit = suppressExactCompletePipeConsumerFirstPicker(
      {
        tokenStart: 0,
        tokenEnd: stage.length,
        prefix: "browse",
        candidates: ["browse"],
        tier: "first"
      },
      stage,
      stage.length
    )
    assert.equal(hit, null)
  })

  it("keeps browse while typing a prefix", () => {
    const stage = "bro"
    const hit = suppressExactCompletePipeConsumerFirstPicker(
      {
        tokenStart: 0,
        tokenEnd: stage.length,
        prefix: "bro",
        candidates: ["browse"],
        tier: "first"
      },
      stage,
      stage.length
    )
    assert.ok(hit)
    assert.deepEqual(hit!.candidates, ["browse"])
  })

  it("returns null after complete consumer and trailing space", () => {
    const stage = "browse "
    const hit = suppressExactCompletePipeConsumerFirstPicker(
      {
        tokenStart: stage.length,
        tokenEnd: stage.length,
        prefix: "",
        candidates: ["browse", "close"],
        tier: "first"
      },
      stage,
      stage.length
    )
    assert.equal(hit, null)
  })

  it("keeps close when alias c is exact but close remains", () => {
    const stage = "c"
    const hit = suppressExactCompletePipeConsumerFirstPicker(
      {
        tokenStart: 0,
        tokenEnd: 1,
        prefix: "c",
        candidates: ["c", "close"],
        tier: "first"
      },
      stage,
      1
    )
    assert.ok(hit)
    assert.deepEqual(hit!.candidates, ["close"])
  })
})

describe("isCompletePipeConsumerWithoutFurtherTokens", () => {
  it("detects finished | browse", () => {
    const line = "tab -list | browse"
    assert.equal(isCompletePipeConsumerWithoutFurtherTokens(line, line.length), true)
  })

  it("detects finished | browse with trailing space", () => {
    const line = "tab -list | browse "
    assert.equal(isCompletePipeConsumerWithoutFurtherTokens(line, line.length), true)
  })

  it("rejects partial consumer", () => {
    const line = "tab -list | bro"
    assert.equal(isCompletePipeConsumerWithoutFurtherTokens(line, line.length), false)
  })

  it("rejects producer stage", () => {
    const line = "tab -list "
    assert.equal(isCompletePipeConsumerWithoutFurtherTokens(line, line.length), false)
  })
})
