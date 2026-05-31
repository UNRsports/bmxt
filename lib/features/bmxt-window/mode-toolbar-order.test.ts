import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  activateModeToolbar,
  deactivateModeToolbar
} from "./mode-toolbar-order.ts"

describe("mode-toolbar-order", () => {
  it("activateModeToolbar appends and deduplicates", () => {
    assert.deepEqual(activateModeToolbar([], "nav"), ["nav"])
    assert.deepEqual(activateModeToolbar(["nav"], "translate"), ["nav", "translate"])
    assert.deepEqual(activateModeToolbar(["translate", "nav"], "translate"), ["nav", "translate"])
  })

  it("deactivateModeToolbar removes one slot", () => {
    assert.deepEqual(deactivateModeToolbar(["nav", "translate"], "nav"), ["translate"])
  })
})
