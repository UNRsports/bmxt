import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  adjacentSearchPickerPreviewHi,
  canPreviewSearchPickerSelection,
  listSearchDetailScrollTargetIndices,
  searchPickerPreviewScrollAnimated
} from "./search-picker-preview-nav.ts"

describe("adjacentSearchPickerPreviewHi", () => {
  const indices = [2, 5, 10, 11]

  it("skips closed rows when moving down", () => {
    assert.equal(adjacentSearchPickerPreviewHi(0, "down", indices), 2)
    assert.equal(adjacentSearchPickerPreviewHi(3, "down", indices), 5)
    assert.equal(adjacentSearchPickerPreviewHi(5, "down", indices), 10)
    assert.equal(adjacentSearchPickerPreviewHi(10, "down", indices), 11)
    assert.equal(adjacentSearchPickerPreviewHi(11, "down", indices), null)
  })

  it("skips closed rows when moving up", () => {
    assert.equal(adjacentSearchPickerPreviewHi(12, "up", indices), 11)
    assert.equal(adjacentSearchPickerPreviewHi(8, "up", indices), 5)
    assert.equal(adjacentSearchPickerPreviewHi(2, "up", indices), null)
  })
})

describe("searchPickerPreviewScrollAnimated", () => {
  it("animates when more than one row is skipped", () => {
    assert.equal(searchPickerPreviewScrollAnimated(2, 5), true)
    assert.equal(searchPickerPreviewScrollAnimated(5, 4), false)
  })
})

describe("listSearchDetailScrollTargetIndices", () => {
  it("lists rows with body pageMatchIndex", () => {
    const hits = [
      { field: "title" as const, displayText: "a", canScrollTo: false },
      { field: "text" as const, displayText: "b", pageMatchIndex: 1, canScrollTo: true },
      { field: "text" as const, displayText: "c", pageMatchIndex: 2, canScrollTo: true }
    ]
    const pageMatches = [
      { lineNo: 0, snippet: "title hit", occurrence: 0 },
      { lineNo: 3, snippet: "body b", occurrence: 0 },
      { lineNo: 8, snippet: "body c", occurrence: 0 }
    ]
    assert.deepEqual(listSearchDetailScrollTargetIndices(hits, pageMatches), [1, 2])
  })
})

describe("canPreviewSearchPickerSelection", () => {
  it("allows rows listed in previewTargetIndices", () => {
    const hits = [
      { field: "title" as const, displayText: "a", canScrollTo: false },
      { field: "text" as const, displayText: "b", pageMatchIndex: 1, canScrollTo: true }
    ]
    assert.equal(canPreviewSearchPickerSelection("detail", 1, [1, 2], hits), true)
    assert.equal(canPreviewSearchPickerSelection("detail", 0, [1, 2], hits), false)
    assert.equal(canPreviewSearchPickerSelection("results", 2, [2, 5], hits), true)
  })

  it("rejects detail rows not in previewTargetIndices once targets are ready", () => {
    const hits = [
      { field: "text" as const, displayText: "b", pageMatchIndex: 1, canScrollTo: true }
    ]
    const pageMatches = [{ lineNo: 3, snippet: "body b", occurrence: 0 }]
    assert.equal(
      canPreviewSearchPickerSelection("detail", 0, [], hits, pageMatches, true),
      false
    )
  })
})
