import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"
import {
  resolveBeforeTabIdOutsideMovers,
  resolveMoveInsertSlot
} from "../../../../shared/lib/features/tabs/resolve-move-insert-slot.ts"

function windowRow(windowId: number): Extract<TabPickerRow, { kind: "window" }> {
  return {
    kind: "window",
    windowId,
    label: `w${windowId}`,
    windowTitle: `w${windowId}`,
    usesActiveTabTitle: false,
    focused: false,
    deviceId: "local",
    remote: false,
    peerWindowId: null
  }
}

function groupRow(
  windowId: number,
  groupId: number
): Extract<TabPickerRow, { kind: "group" }> {
  return {
    kind: "group",
    windowId,
    groupId,
    label: `g${groupId}`,
    title: `g${groupId}`,
    color: "blue",
    deviceId: "local",
    remote: false,
    peerWindowId: null,
    peerGroupId: null
  }
}

function tabRow(
  tabId: number,
  windowId: number,
  groupId: number | null
): Extract<TabPickerRow, { kind: "tab" }> {
  return {
    kind: "tab",
    tabId,
    windowId,
    groupId,
    groupColor: null,
    title: `t${tabId}`,
    url: `https://example/${tabId}`,
    faviconSrc: null,
    active: false,
    deviceId: "local",
    remote: false,
    peerTabId: null,
    peerWindowId: null,
    peerGroupId: null
  }
}

describe("resolveMoveInsertSlot", () => {
  const rows: TabPickerRow[] = [
    windowRow(1),
    tabRow(10, 1, null),
    groupRow(1, 7),
    tabRow(20, 1, 7),
    tabRow(30, 1, 7),
    tabRow(40, 1, null)
  ]
  const visible = rows.map((_, i) => i)

  it("maps a tab row to the gap above that tab", () => {
    const slot = resolveMoveInsertSlot(rows, visible, 1)
    assert.ok(slot)
    assert.equal(slot!.beforeTabId, 10)
    assert.equal(slot!.windowId, 1)
    assert.equal(slot!.ungroup, true)
    assert.deepEqual(slot!.marker, { rowIndex: 1, place: "before" })
  })

  it("maps a group row to the gap above the first tab in that group", () => {
    const slot = resolveMoveInsertSlot(rows, visible, 2)
    assert.ok(slot)
    assert.equal(slot!.beforeTabId, 20)
    assert.equal(slot!.groupId, 7)
    assert.equal(slot!.ungroup, false)
    assert.deepEqual(slot!.marker, { rowIndex: 3, place: "before" })
  })

  it("maps a window row to the gap after the last tab in that window", () => {
    const slot = resolveMoveInsertSlot(rows, visible, 0)
    assert.ok(slot)
    assert.equal(slot!.beforeTabId, null)
    assert.equal(slot!.windowId, 1)
    assert.equal(slot!.groupId, null)
    assert.equal(slot!.ungroup, false)
    assert.deepEqual(slot!.marker, { rowIndex: 5, place: "after" })
  })

  it("joins the group when the slot is before a grouped tab", () => {
    const slot = resolveMoveInsertSlot(rows, visible, 4)
    assert.ok(slot)
    assert.equal(slot!.beforeTabId, 30)
    assert.equal(slot!.groupId, 7)
    assert.equal(slot!.ungroup, false)
  })

  it("headerDestMode appends after the last tab in the destination group", () => {
    const slot = resolveMoveInsertSlot(rows, visible, 2, { headerDestMode: true })
    assert.ok(slot)
    assert.equal(slot!.groupId, 7)
    assert.equal(slot!.beforeTabId, 40)
    assert.equal(slot!.ungroup, false)
    assert.deepEqual(slot!.marker, { rowIndex: 4, place: "after" })
  })

  it("headerDestMode rejects tab-row destinations", () => {
    assert.equal(resolveMoveInsertSlot(rows, visible, 1, { headerDestMode: true }), null)
  })
})

describe("resolveBeforeTabIdOutsideMovers", () => {
  const rows: TabPickerRow[] = [
    windowRow(1),
    tabRow(10, 1, null),
    tabRow(20, 1, null),
    tabRow(30, 1, null),
    tabRow(40, 1, null)
  ]

  it("keeps beforeTabId when it is not among movers", () => {
    assert.equal(resolveBeforeTabIdOutsideMovers(rows, 30, [10, 20]), 30)
  })

  it("advances to the next non-moving tab in the same window", () => {
    assert.equal(resolveBeforeTabIdOutsideMovers(rows, 20, [10, 20]), 30)
  })

  it("returns null (end of window) when every following tab is also moving", () => {
    assert.equal(resolveBeforeTabIdOutsideMovers(rows, 20, [10, 20, 30, 40]), null)
  })

  it("returns null when beforeTabId is already null", () => {
    assert.equal(resolveBeforeTabIdOutsideMovers(rows, null, [10, 20]), null)
  })
})
