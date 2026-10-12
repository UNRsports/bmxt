/**
 * EN: Unit tests for popup pending handoff retain helpers (browse + pickers).
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"
import {
  retainPopupBrowseForUi,
  retainPopupPickersForUi,
  takeRetainedPopupBrowseForUi,
  takeRetainedPopupPickersForUi
} from "./popup-pending-handoff.ts"

describe("popup-pending-handoff retain", () => {
  it("takeRetainedPopupPickersForUi returns once then null", () => {
    retainPopupPickersForUi({
      s1: {
        tabs: {
          rows: [],
          showUrl: false,
          initialHi: 2
        },
        search: null,
        dom: null,
        setting: null
      }
    })
    const first = takeRetainedPopupPickersForUi()
    assert.ok(first !== null)
    assert.equal(first.s1?.tabs?.initialHi, 2)
    assert.equal(takeRetainedPopupPickersForUi(), null)
  })

  it("browse and pickers retain independently", () => {
    retainPopupBrowseForUi(createEmptyFloatBrowseState())
    retainPopupPickersForUi({})
    assert.ok(takeRetainedPopupBrowseForUi() !== null)
    const pickers = takeRetainedPopupPickersForUi()
    assert.ok(pickers !== null)
    assert.deepEqual(pickers, {})
  })
})
