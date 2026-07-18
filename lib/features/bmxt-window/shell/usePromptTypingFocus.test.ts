import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldPreserveLogSelectionOnKey } from "./usePromptTypingFocus.ts"

describe("shouldPreserveLogSelectionOnKey", () => {
  it("preserves selection when Control is pressed alone", () => {
    assert.equal(
      shouldPreserveLogSelectionOnKey(
        { key: "Control", ctrlKey: true, metaKey: false, altKey: false },
        true
      ),
      true
    )
  })

  it("preserves selection for Ctrl+C", () => {
    assert.equal(
      shouldPreserveLogSelectionOnKey(
        { key: "c", ctrlKey: true, metaKey: false, altKey: false },
        true
      ),
      true
    )
  })

  it("does not preserve when there is no selection", () => {
    assert.equal(
      shouldPreserveLogSelectionOnKey(
        { key: "Control", ctrlKey: true, metaKey: false, altKey: false },
        false
      ),
      false
    )
  })

  it("does not preserve for printable typing with a selection", () => {
    assert.equal(
      shouldPreserveLogSelectionOnKey(
        { key: "a", ctrlKey: false, metaKey: false, altKey: false },
        true
      ),
      false
    )
  })
})
