import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseTabChipProducerSegment } from "./tab-chip-producer.ts"

describe("parseTabChipProducerSegment", () => {
  it("parses chip ids", () => {
    assert.deepEqual(parseTabChipProducerSegment("#t:12 #t:34"), [12, 34])
  })

  it("strips trailing incomplete tab: trigger", () => {
    assert.deepEqual(parseTabChipProducerSegment("#t:1 #t:2 tab:"), [1, 2])
    assert.deepEqual(parseTabChipProducerSegment("#t:1 tab:foo"), [1])
    assert.deepEqual(parseTabChipProducerSegment("#t:1 tab::github"), [1])
  })

  it("returns null for empty or trigger-only", () => {
    assert.equal(parseTabChipProducerSegment("tab:"), null)
    assert.equal(parseTabChipProducerSegment("tab::x"), null)
    assert.equal(parseTabChipProducerSegment(""), null)
  })

  it("returns null when mixed with commands", () => {
    assert.equal(parseTabChipProducerSegment("tab -list"), null)
    assert.equal(parseTabChipProducerSegment("#t:1 back"), null)
    assert.equal(parseTabChipProducerSegment("back"), null)
  })

  it("dedupes ids", () => {
    assert.deepEqual(parseTabChipProducerSegment("#t:5 #t:5"), [5])
  })
})
