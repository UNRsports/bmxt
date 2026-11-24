import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isGeckoPromptEffectHost } from "../../../../shared/lib/features/prompt-effects/is-gecko.ts"

describe("isGeckoPromptEffectHost", () => {
  it("is false in Node (no Firefox UA)", () => {
    assert.equal(isGeckoPromptEffectHost(), false)
  })
})
