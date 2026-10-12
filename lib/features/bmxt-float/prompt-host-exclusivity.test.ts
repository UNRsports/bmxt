/**
 * EN: Unit tests for popup XOR float prompt-host exclusivity.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldSuppressFloatWhilePopupOwnsUi } from "./prompt-host-exclusivity.ts"

describe("prompt-host-exclusivity", () => {
  it("suppresses float when preferred host is popup", () => {
    assert.equal(
      shouldSuppressFloatWhilePopupOwnsUi({
        preferredHost: "popup",
        popupWindowOpen: false
      }),
      true
    )
  })

  it("suppresses float when a popup window is open even if preferred is float", () => {
    assert.equal(
      shouldSuppressFloatWhilePopupOwnsUi({
        preferredHost: "float",
        popupWindowOpen: true
      }),
      true
    )
  })

  it("allows float when preferred is float and no popup window", () => {
    assert.equal(
      shouldSuppressFloatWhilePopupOwnsUi({
        preferredHost: "float",
        popupWindowOpen: false
      }),
      false
    )
  })
})
