import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clearCandidateMenuSuppressedUntilTab,
  isCandidateMenuSuppressedUntilTab,
  markCandidateMenuSuppressedUntilTab
} from "../../../../shared/lib/features/command-line/candidate-menu-open-policy.ts"

describe("candidate-menu-open-policy", () => {
  it("stays suppressed until Tab clears the gate", () => {
    clearCandidateMenuSuppressedUntilTab()
    assert.equal(isCandidateMenuSuppressedUntilTab(), false)

    markCandidateMenuSuppressedUntilTab()
    assert.equal(isCandidateMenuSuppressedUntilTab(), true)

    markCandidateMenuSuppressedUntilTab()
    assert.equal(isCandidateMenuSuppressedUntilTab(), true)

    clearCandidateMenuSuppressedUntilTab()
    assert.equal(isCandidateMenuSuppressedUntilTab(), false)
  })
})
