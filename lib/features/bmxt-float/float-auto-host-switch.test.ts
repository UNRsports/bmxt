/**
 * EN: Unit tests for automatic popup ↔ float host switch helpers.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendAutoSwitchLogLine,
  isBmxtPopupTryReturnToFloatMessage
} from "./float-auto-host-switch.ts"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"

describe("float-auto-host-switch", () => {
  it("isBmxtPopupTryReturnToFloatMessage accepts a valid request", () => {
    assert.equal(
      isBmxtPopupTryReturnToFloatMessage({
        type: "BMXT_POPUP_TRY_RETURN_TO_FLOAT",
        toTabId: 7,
        sessions: {
          v: 2,
          order: ["s1"],
          activeId: "s1",
          logsById: { s1: [] },
          namesById: {}
        },
        browse: createEmptyFloatBrowseState()
      }),
      true
    )
  })

  it("isBmxtPopupTryReturnToFloatMessage rejects malformed requests", () => {
    assert.equal(isBmxtPopupTryReturnToFloatMessage(null), false)
    assert.equal(
      isBmxtPopupTryReturnToFloatMessage({
        type: "BMXT_POPUP_TRY_RETURN_TO_FLOAT",
        toTabId: -1,
        sessions: { v: 2 },
        browse: createEmptyFloatBrowseState()
      }),
      false
    )
  })

  it("appendAutoSwitchLogLine appends onto the active session", () => {
    const base = {
      sessions: {
        v: 2 as const,
        order: ["s1"],
        activeId: "s1",
        logsById: { s1: ["> hi"] },
        namesById: {}
      },
      browse: createEmptyFloatBrowseState(),
      pickersBySession: {}
    }
    const next = appendAutoSwitchLogLine(base, "moved")
    assert.deepEqual(next.sessions.logsById.s1, ["> hi", "moved"])
  })
})
