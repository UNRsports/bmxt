import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  collectSheetsMatchesFromCsv,
  sheetsCsvPreviewLines
} from "../../../../../shared/lib/features/page-extract/sheets/collect-sheets-matches-from-csv.ts"
import { parseSheetsCsv } from "../../../../../shared/lib/features/page-extract/sheets/parse-sheets-csv.ts"
import { cellRefFromIndices, columnIndexToLetters } from "../../../../../shared/lib/features/page-extract/sheets/sheets-a1.ts"

describe("sheets A1 helpers", () => {
  it("maps column indices to letters", () => {
    assert.equal(columnIndexToLetters(0), "A")
    assert.equal(columnIndexToLetters(25), "Z")
    assert.equal(columnIndexToLetters(26), "AA")
    assert.equal(cellRefFromIndices(1, 12), "B12")
  })
})

describe("parseSheetsCsv", () => {
  it("parses quoted commas and newlines", () => {
    const rows = parseSheetsCsv('Name,Note\n"Ada, Lovelace","line1\nline2"\n')
    assert.deepEqual(rows, [
      ["Name", "Note"],
      ["Ada, Lovelace", "line1\nline2"]
    ])
  })

  it("unescapes doubled quotes", () => {
    const rows = parseSheetsCsv('"say ""hi""",x\n')
    assert.deepEqual(rows, [['say "hi"', "x"]])
  })
})

describe("collectSheetsMatchesFromCsv", () => {
  it("finds cells case-insensitively with A1 cellRef", () => {
    const csv = "a,b\nhello,World\nfoo,bar\n"
    const result = collectSheetsMatchesFromCsv(csv, "world", 10, 10_000)
    assert.equal(result.matches.length, 1)
    assert.equal(result.matches[0]?.cellRef, "B2")
    assert.equal(result.matches[0]?.lineNo, 2)
    assert.match(result.matches[0]?.snippet ?? "", /^B2:/)
  })

  it("respects maxTextChars truncation", () => {
    const csv = "x\n" + "abcdefghij\n".repeat(20)
    const result = collectSheetsMatchesFromCsv(csv, "abc", 50, 15)
    assert.equal(result.truncated, true)
    assert.ok(result.bodyLength <= 15)
  })
})

describe("sheetsCsvPreviewLines", () => {
  it("emits A1 preview lines", () => {
    const { lines } = sheetsCsvPreviewLines("a,b\n1,2\n", 10, 10_000)
    assert.deepEqual(lines, ["A1: a", "B1: b", "A2: 1", "B2: 2"])
  })
})
