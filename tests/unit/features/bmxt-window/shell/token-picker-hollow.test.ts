import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isHollowTokenPickerModel } from "../../../../../shared/lib/features/bmxt-window/shell/token-picker-hollow.ts"
import type { TokenPickerModel } from "../../../../../shared/lib/features/bmxt-window/token-picker-panel.tsx"

function model(partial: Partial<TokenPickerModel> = {}): TokenPickerModel {
  return {
    tokenStart: 8,
    tokenEnd: 12,
    candidates: [],
    hi: 0,
    tier: "second",
    pipeAvailable: true,
    ...partial
  }
}

describe("isHollowTokenPickerModel", () => {
  it("is true for the empty-filter keep-alive shape", () => {
    assert.equal(isHollowTokenPickerModel(model()), true)
  })

  it("is false when candidates remain", () => {
    assert.equal(isHollowTokenPickerModel(model({ candidates: ["-list"] })), false)
  })

  it("is false when empty helps array is still attached ([] === [] help trap)", () => {
    assert.equal(isHollowTokenPickerModel(model({ candidateHelps: [] })), false)
  })
})
