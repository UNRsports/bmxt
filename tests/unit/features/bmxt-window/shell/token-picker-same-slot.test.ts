import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isSameImeTokenPickerSlot } from "../../../../../shared/lib/features/bmxt-window/shell/token-picker-same-slot.ts"
import type { TokenPickerModel } from "../../../../../shared/lib/features/bmxt-window/token-picker-panel.tsx"

function model(partial: Partial<TokenPickerModel> = {}): TokenPickerModel {
  return {
    tokenStart: 0,
    tokenEnd: 3,
    candidates: ["tab", "tabs"],
    hi: 0,
    tier: "first",
    ...partial
  }
}

describe("isSameImeTokenPickerSlot", () => {
  it("returns false for null prev", () => {
    assert.equal(
      isSameImeTokenPickerSlot(null, {
        tokenStart: 0,
        tokenEnd: 3,
        tier: "first",
        candidates: ["tab"]
      }),
      false
    )
  })

  it("returns true when slot and candidates match", () => {
    const prev = model()
    assert.equal(
      isSameImeTokenPickerSlot(prev, {
        tokenStart: prev.tokenStart,
        tokenEnd: prev.tokenEnd,
        tier: prev.tier,
        candidates: prev.candidates
      }),
      true
    )
  })

  it("returns false when candidates change", () => {
    const prev = model()
    assert.equal(
      isSameImeTokenPickerSlot(prev, {
        tokenStart: prev.tokenStart,
        tokenEnd: prev.tokenEnd,
        tier: prev.tier,
        candidates: ["tab"]
      }),
      false
    )
  })
})
