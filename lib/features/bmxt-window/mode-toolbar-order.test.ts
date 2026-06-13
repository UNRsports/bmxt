import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  activateModeToolbar,
  deactivateModeToolbar,
  deriveModeToolbarOrderFromPickers
} from "./mode-toolbar-order.ts"
import { EMPTY_SESSION_PICKERS } from "../side-picker/session/session-pickers.ts"

describe("mode-toolbar-order", () => {
  it("activateModeToolbar appends and deduplicates", () => {
    assert.deepEqual(activateModeToolbar([], "nav"), ["nav"])
    assert.deepEqual(activateModeToolbar(["nav"], "translate"), ["nav", "translate"])
    assert.deepEqual(activateModeToolbar(["translate", "nav"], "translate"), ["nav", "translate"])
  })

  it("deactivateModeToolbar removes one slot", () => {
    assert.deepEqual(deactivateModeToolbar(["nav", "translate"], "nav"), ["translate"])
  })

  it("deriveModeToolbarOrderFromPickers rebuilds from open pickers", () => {
    assert.deepEqual(deriveModeToolbarOrderFromPickers(EMPTY_SESSION_PICKERS, false), [])
    assert.deepEqual(
      deriveModeToolbarOrderFromPickers({ ...EMPTY_SESSION_PICKERS, tabs: {} as never }, true),
      ["nav", "tabs"]
    )
  })
})
