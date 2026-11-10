import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldFocusPromptIme } from "../../../../../shared/lib/features/bmxt-window/shell/should-focus-prompt-ime.ts"

describe("shouldFocusPromptIme", () => {
  it("allows prompt focus only on the terminal pane", () => {
    assert.equal(shouldFocusPromptIme("terminal"), true)
    assert.equal(shouldFocusPromptIme("tabs"), false)
    assert.equal(shouldFocusPromptIme("search"), false)
    assert.equal(shouldFocusPromptIme("dom"), false)
    assert.equal(shouldFocusPromptIme("setting"), false)
    assert.equal(shouldFocusPromptIme("detailBar"), false)
  })
})
