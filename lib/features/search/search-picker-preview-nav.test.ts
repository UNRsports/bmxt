import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  adjacentSearchPickerPreviewHi,
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
