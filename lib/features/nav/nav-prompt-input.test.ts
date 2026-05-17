import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { navBeforeInputAction } from "./nav-prompt-input.ts"

describe("nav-prompt-input", () => {
  it("navBeforeInputAction", () => {
    assert.equal(navBeforeInputAction("deleteContentBackward", null), "backward")
    assert.equal(navBeforeInputAction("deleteContentForward", null), "forward")
    assert.equal(navBeforeInputAction("insertText", "a"), "insert")
    assert.equal(navBeforeInputAction("insertFromComposition", "あ"), "insert")
    assert.equal(navBeforeInputAction("insertCompositionText", "か"), null)
  })
})
