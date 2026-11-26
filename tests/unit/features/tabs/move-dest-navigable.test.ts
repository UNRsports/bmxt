import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"
import {
  isMoveHeaderDestMode,
  moveHeaderDestVisibleIndices,
  snapMoveDestToHeaderVisibleIndex,
  stepMoveDestVisibleIndex
} from "../../../../shared/lib/features/tabs/move-dest-navigable.ts"

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
  windowId: number
): Extract<TabPickerRow, { kind: "tab" }> {
  return {
    kind: "tab",
    tabId,
    windowId,
    groupId: null,
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

describe("move-dest-navigable", () => {
  const rows: TabPickerRow[] = [
    windowRow(1),
    tabRow(10, 1),
    groupRow(1, 7),
    tabRow(20, 1),
    windowRow(2),
    tabRow(30, 2)
  ]
  const visible = rows.map((_, i) => i)

  it("enables header dest mode only for group marks", () => {
    assert.equal(isMoveHeaderDestMode("group"), true)
    assert.equal(isMoveHeaderDestMode("tab"), false)
    assert.equal(isMoveHeaderDestMode(null), false)
  })

  it("lists only window/group visible indices", () => {
    assert.deepEqual(moveHeaderDestVisibleIndices(rows, visible), [0, 2, 4])
  })

  it("snaps preferred hi onto a header row", () => {
    assert.equal(snapMoveDestToHeaderVisibleIndex(rows, visible, 1), 2)
    assert.equal(snapMoveDestToHeaderVisibleIndex(rows, visible, 2), 2)
    assert.equal(snapMoveDestToHeaderVisibleIndex(rows, visible, 5), 4)
  })

  it("steps only among header destinations when headerOnly", () => {
    assert.equal(stepMoveDestVisibleIndex(rows, visible, 0, 1, true), 2)
    assert.equal(stepMoveDestVisibleIndex(rows, visible, 2, 1, true), 4)
    assert.equal(stepMoveDestVisibleIndex(rows, visible, 4, 1, true), 0)
    assert.equal(stepMoveDestVisibleIndex(rows, visible, 1, 1, false), 2)
  })
})
