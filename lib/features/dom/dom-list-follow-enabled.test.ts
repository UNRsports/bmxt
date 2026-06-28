import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { isDomListPickerFollowEnabled } from "./dom-list-follow-enabled.ts"
import type { DomListPickerState } from "./dom-list-picker-input.ts"

const linesPicker: DomListPickerState = {
  kind: "lines",
  lines: ["a"],
  commandLine: "dom -list --html"
}

describe("isDomListPickerFollowEnabled", () => {
  it("is false when picker is closed or not lines", () => {
    assert.equal(isDomListPickerFollowEnabled(null, "dom", null), false)
    assert.equal(
      isDomListPickerFollowEnabled(
        { kind: "prompt", message: [], commandLine: "dom -list --html" },
        "dom",
        null
      ),
      false
    )
  })

  it("is true on dom picker focus", () => {
    assert.equal(isDomListPickerFollowEnabled(linesPicker, "dom", null), true)
  })

  it("is true on dom detail bar focus", () => {
    assert.equal(isDomListPickerFollowEnabled(linesPicker, "detailBar", "dom"), true)
  })

  it("is false when terminal prompt is focused even if column stays open", () => {
    assert.equal(isDomListPickerFollowEnabled(linesPicker, "terminal", null), false)
  })

  it("is false on another detail bar", () => {
    assert.equal(isDomListPickerFollowEnabled(linesPicker, "detailBar", "tabs"), false)
  })
})
