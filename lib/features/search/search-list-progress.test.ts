import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendSearchLoadingProgressLine,
  trimSearchLoadingProgressLines,
  MAX_SEARCH_LOADING_PROGRESS_LINES
} from "./search-list-progress.ts"

describe("search-list-progress", () => {
  it("keeps only the latest progress rows", () => {
    const lines = Array.from({ length: MAX_SEARCH_LOADING_PROGRESS_LINES + 5 }, (_, i) => `L${i}`)
    const trimmed = trimSearchLoadingProgressLines(lines)
    assert.equal(trimmed.length, MAX_SEARCH_LOADING_PROGRESS_LINES)
    assert.equal(trimmed[0], "L5")
    assert.equal(trimmed[trimmed.length - 1], `L${MAX_SEARCH_LOADING_PROGRESS_LINES + 4}`)
  })

  it("appends and trims in one step", () => {
    const base = Array.from({ length: MAX_SEARCH_LOADING_PROGRESS_LINES }, (_, i) => `L${i}`)
    const next = appendSearchLoadingProgressLine(base, "new")
    assert.equal(next.length, MAX_SEARCH_LOADING_PROGRESS_LINES)
    assert.equal(next[next.length - 1], "new")
    assert.equal(next[0], "L1")
  })
})
