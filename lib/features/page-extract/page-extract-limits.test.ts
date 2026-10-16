import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ABSOLUTE_MAX_PAGE_EXTRACT_CHARS,
  clampPageExtractMaxChars
} from "./page-extract-limits.ts"

describe("clampPageExtractMaxChars", () => {
  it("rejects non-finite and negative values as empty", () => {
    assert.equal(clampPageExtractMaxChars(Number.NaN), 0)
    assert.equal(clampPageExtractMaxChars(Number.POSITIVE_INFINITY), 0)
    assert.equal(clampPageExtractMaxChars(-1), 0)
  })

  it("maps unlimit (0) and oversized values to the absolute ceiling", () => {
    assert.equal(clampPageExtractMaxChars(0), ABSOLUTE_MAX_PAGE_EXTRACT_CHARS)
    assert.equal(
      clampPageExtractMaxChars(ABSOLUTE_MAX_PAGE_EXTRACT_CHARS + 1),
      ABSOLUTE_MAX_PAGE_EXTRACT_CHARS
    )
  })

  it("keeps finite positive values within the ceiling", () => {
    assert.equal(clampPageExtractMaxChars(100), 100)
    assert.equal(clampPageExtractMaxChars(500_000), 500_000)
  })
})
