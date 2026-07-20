import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractFixedCandidateTokensFromLine,
  rankTokenCandidates,
  resetTokenCandidateMruMemoryCacheForTests,
  seedTokenCandidateMruMemoryForTests
} from "./token-candidate-mru.ts"

describe("rankTokenCandidates", () => {
  it("sorts alphabetically when MRU is empty", () => {
    resetTokenCandidateMruMemoryCacheForTests()
    assert.deepEqual(rankTokenCandidates(["tabs", "aboutbmxt", "search"]), [
      "aboutbmxt",
      "search",
      "tabs"
    ])
  })

  it("puts MRU tokens first (newest first), then unused A–Z", () => {
    seedTokenCandidateMruMemoryForTests(["tabs", "-list"])
    assert.deepEqual(rankTokenCandidates(["aboutbmxt", "search", "tabs", "dom"]), [
      "tabs",
      "aboutbmxt",
      "dom",
      "search"
    ])
    assert.deepEqual(rankTokenCandidates(["-exit", "-list", "-setting", "help"]), [
      "-list",
      "-exit",
      "-setting",
      "help"
    ])
  })
})

describe("extractFixedCandidateTokensFromLine", () => {
  it("extracts first/second/third fixed tokens and skips free text", () => {
    resetTokenCandidateMruMemoryCacheForTests()
    assert.deepEqual(extractFixedCandidateTokensFromLine("tabs -list -url"), [
      "tabs",
      "-list",
      "-url"
    ])
    assert.deepEqual(extractFixedCandidateTokensFromLine("search -list hello world"), [
      "search",
      "-list"
    ])
  })
})
