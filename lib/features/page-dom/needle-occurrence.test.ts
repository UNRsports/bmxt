import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { globalNeedleOccurrenceForLine } from "./needle-occurrence.ts"

describe("globalNeedleOccurrenceForLine", () => {
  const lines = [
    "BMXt — Privacy Policy",
    "no hit here",
    "intro BMXt tool",
    "BMXt again BMXt twice"
  ]

  it("returns the first needle on the requested line", () => {
    assert.equal(globalNeedleOccurrenceForLine(lines, 1, "BMXt"), 0)
    assert.equal(globalNeedleOccurrenceForLine(lines, 3, "BMXt"), 1)
    assert.equal(globalNeedleOccurrenceForLine(lines, 4, "BMXt"), 2)
  })

  it("returns -1 when the line does not contain the needle", () => {
    assert.equal(globalNeedleOccurrenceForLine(lines, 2, "BMXt"), -1)
    assert.equal(globalNeedleOccurrenceForLine(lines, 99, "BMXt"), -1)
  })
})
