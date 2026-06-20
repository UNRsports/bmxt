import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  listTabPickerActions,
  resolveTabActionTargetTabIds,
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

describe("resolveTabActionTargetTabIds", () => {
  it("uses only # marks when two or more tabs are marked", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: "tab",
        markedTabIds: [1, 2],
        highlightedTabId: 99,
        selectedTabIds: []
      }),
      [1, 2]
    )
  })

  it("uses highlighted tab for single-tab case without # marks", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: null,
        markedTabIds: [],
        highlightedTabId: 42,
        selectedTabIds: []
      }),
      [42]
    )
  })

  it("uses highlighted tab when only one # mark exists but hi is elsewhere", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: "tab",
        markedTabIds: [2],
        highlightedTabId: 99,
        selectedTabIds: []
      }),
      [99]
    )
  })

  it("uses the lone # mark when hi is not on a tab row", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: "tab",
        markedTabIds: [3],
        highlightedTabId: null,
        selectedTabIds: [3]
      }),
      [3]
    )
  })

  it("falls back to selectedTabIds for window/group marks", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: "window",
        markedTabIds: [],
        highlightedTabId: null,
        selectedTabIds: [7, 8]
      }),
      [7, 8]
    )
  })

  it("uses marked tab ids when highlight is on a window row", () => {
    assert.deepEqual(
      resolveTabActionTargetTabIds({
        markedKind: "tab",
        markedTabIds: [3, 4],
        highlightedTabId: null,
        selectedTabIds: [3, 4]
      }),
      [3, 4]
    )
  })
})
