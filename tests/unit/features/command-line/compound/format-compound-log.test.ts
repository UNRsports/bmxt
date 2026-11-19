import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { shouldOmitCompoundSegmentHeader } from "../../../../../shared/lib/features/command-line/compound/omit-compound-segment-header.ts"

describe("shouldOmitCompoundSegmentHeader", () => {
  it("omits [{segment}] for a lone compound segment (picker pipe already echoed as > line)", () => {
    assert.equal(shouldOmitCompoundSegmentHeader(1), true)
    assert.equal(shouldOmitCompoundSegmentHeader(0), true)
  })

  it("keeps [{segment}] for multi-segment compound lines", () => {
    assert.equal(shouldOmitCompoundSegmentHeader(2), false)
    assert.equal(shouldOmitCompoundSegmentHeader(3), false)
  })
})
