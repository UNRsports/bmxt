import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"
import { resolveActionMenuTabTargets } from "../../../../shared/lib/features/tabs/tab-picker-action-menu.ts"

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
  groupId: number,
  label: string
): Extract<TabPickerRow, { kind: "group" }> {
  return {
    kind: "group",
    windowId,
    groupId,
    label,
    title: label.replace(/^【|】$/g, ""),
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
  groupId: number | null,
  groupColor: "blue" | null = groupId !== null ? "blue" : null
): Extract<TabPickerRow, { kind: "tab" }> {
  return {
    kind: "tab",
    tabId,
    windowId,
    groupId,
    groupColor,
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

describe("resolveActionMenuTabTargets", () => {
  const rows: TabPickerRow[] = [
    windowRow(1),
    groupRow(1, 7, "【Work】"),
    tabRow(10, 1, 7),
    tabRow(11, 1, 7),
    tabRow(20, 1, null)
  ]

  it("attaches picker group labels to grouped tab targets", () => {
    const targets = resolveActionMenuTabTargets(rows, "tab", [10, 20], [], [], undefined)
    assert.equal(targets.length, 2)
    assert.equal(targets[0]?.groupTitle, "【Work】")
    assert.equal(targets[0]?.groupColor, "blue")
    assert.equal(targets[1]?.groupTitle, null)
    assert.equal(targets[1]?.groupColor, null)
  })
})
