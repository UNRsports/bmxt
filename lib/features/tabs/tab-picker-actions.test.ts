import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listTabPickerActions,
  resolveTabPickerActionTargetKind,
  tabPickerActionIsImmediate,
  tabPickerActionToBulkSubMode
} from "./tab-picker-actions.ts"

describe("listTabPickerActions", () => {
  it("lists tab actions for a highlighted tab row", () => {
    assert.deepEqual(
      listTabPickerActions({
        markedKind: null,
        rowKind: "tab",
        hlSearchPattern: ""
      }),
      ["move", "close", "group", "newWindow", "reload", "duplicate"]
    )
  })

  it("uses marked tab kind when multiple tabs are selected", () => {
    assert.deepEqual(
      listTabPickerActions({
        markedKind: "tab",
        rowKind: "window",
        hlSearchPattern: ""
      }),
      ["move", "close", "group", "newWindow", "reload", "duplicate"]
    )
  })

  it("lists window actions", () => {
    assert.deepEqual(
      listTabPickerActions({
        markedKind: null,
        rowKind: "window",
        hlSearchPattern: "foo"
      }),
      ["close", "newTab", "edit", "nohlsearch"]
    )
  })

  it("lists group actions", () => {
    assert.deepEqual(
      listTabPickerActions({
        markedKind: "group",
        rowKind: "tab",
        hlSearchPattern: ""
      }),
      ["move", "close", "newWindow", "edit"]
    )
  })
})

describe("resolveTabPickerActionTargetKind", () => {
  it("prefers marked kind over row kind", () => {
    assert.equal(resolveTabPickerActionTargetKind("tab", "window"), "tab")
  })
})

describe("tabPickerActionToBulkSubMode", () => {
  it("maps bulk actions", () => {
    assert.equal(tabPickerActionToBulkSubMode("move"), "move")
    assert.equal(tabPickerActionToBulkSubMode("reload"), null)
  })
})

describe("tabPickerActionIsImmediate", () => {
  it("treats reload and duplicate as immediate", () => {
    assert.equal(tabPickerActionIsImmediate("reload"), true)
    assert.equal(tabPickerActionIsImmediate("duplicate"), true)
    assert.equal(tabPickerActionIsImmediate("move"), false)
  })
})
