import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isSearchListReadyToRun,
  searchListPatternFromLine
} from "./search-list-picker-parse.ts"

describe("isSearchListReadyToRun", () => {
  it("allows scope-only dispatch with empty pattern", () => {
    assert.equal(isSearchListReadyToRun("search -list --history"), true)
    assert.equal(isSearchListReadyToRun("search -list --bookmark"), true)
    assert.equal(isSearchListReadyToRun("search -list --page"), true)
  })

  it("allows scope with trailing pattern", () => {
    assert.equal(isSearchListReadyToRun("search -list --history github"), true)
    assert.equal(searchListPatternFromLine("search -list --history github"), "github")
  })

  it("requires trailing space for scope-less search -list continuation", () => {
    assert.equal(isSearchListReadyToRun("search -list"), false)
    assert.equal(isSearchListReadyToRun("search -list", "search -list "), true)
  })

  it("blocks partial scope tokens", () => {
    assert.equal(isSearchListReadyToRun("search -list --hist"), false)
    assert.equal(isSearchListReadyToRun("search -list pa"), false)
  })
})
