import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isPickerAltBlockedChord,
  isPickerAltOnlyChord
} from "./picker-alt-chord.ts"
import { shouldRunPickerAltPreview } from "./picker-alt-preview-mode.ts"

describe("picker-alt-preview-mode", () => {
  it("auto runs without Alt", () => {
    assert.equal(shouldRunPickerAltPreview("auto", false), true)
  })

  it("manual requires Alt", () => {
    assert.equal(shouldRunPickerAltPreview("manual", false), false)
    assert.equal(shouldRunPickerAltPreview("manual", true), true)
  })
})

describe("picker-alt-chord", () => {
  it("detects alt-only chord", () => {
    assert.equal(
      isPickerAltOnlyChord({ altKey: true, ctrlKey: false, metaKey: false, shiftKey: false }),
      true
    )
    assert.equal(
      isPickerAltBlockedChord({ altKey: true, ctrlKey: true, metaKey: false, shiftKey: false }),
      true
    )
  })
})
