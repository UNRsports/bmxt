import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assignGlobalOccurrencesToPageMatches,
  findRawNeedleInHaystack,
  globalNeedleOccurrenceForLine
} from "./needle-occurrence.ts"
import type { SearchPageMatch } from "../side-picker/model/picker-entry.ts"

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

describe("assignGlobalOccurrencesToPageMatches", () => {
  it("maps repeated hits on the same line to ascending globalOccurrence", () => {
    const bodyLines = ["alpha BMXt beta", "line two", "BMXt again BMXt twice"]
    const matches: SearchPageMatch[] = [
      { lineNo: 1, snippet: "alpha BMXt beta", occurrence: 0 },
      { lineNo: 3, snippet: "BMXt again BMXt twice", occurrence: 0 },
      { lineNo: 3, snippet: "…again BMXt twice…", occurrence: 1 }
    ]
    const out = assignGlobalOccurrencesToPageMatches(matches, bodyLines, "BMXt")
    assert.deepEqual(
      out.map((m) => m.globalOccurrence),
      [0, 1, 2]
    )
  })
})

describe("findRawNeedleInHaystack", () => {
  it("matches case-insensitive ASCII", () => {
    const hit = findRawNeedleInHaystack("hello BMXt world", "bmxt")
    assert.deepEqual(hit, { index: 6, length: 4 })
  })

  it("matches NFKC-normalized full-width alphanumerics", () => {
    const hit = findRawNeedleInHaystack("code ＡＢＣ here", "ABC")
    assert.ok(hit)
    assert.equal(hit!.index, 5)
    assert.equal(hit!.length, 3)
  })
})
