import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"
import { computeSelectedTabIdsFromMarks } from "../../../../shared/lib/features/tabs/picker-selected-tab-ids.ts"

function tabRow(
  tabId: number,
  windowId: number,
  groupId: number | null = null
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

describe("computeSelectedTabIdsFromMarks", () => {
  it("preserves picker row order for marked tabs (not numeric tab-id sort)", () => {
    // EN: Visual order is 50 → 20 → 30; numeric id sort would wrongly yield 20,30,50.
    const rows: TabPickerRow[] = [
      tabRow(50, 1),
      tabRow(20, 1),
      tabRow(30, 1)
    ]
    const ids = computeSelectedTabIdsFromMarks(rows, "tab", [30, 50, 20], [], [])
    assert.deepEqual(ids, [50, 20, 30])
  })

  it("preserves row order for window and group marks", () => {
    const rows: TabPickerRow[] = [
      tabRow(9, 1, null),
      tabRow(3, 1, 7),
      tabRow(8, 1, 7),
      tabRow(2, 2, null)
    ]
    assert.deepEqual(
      computeSelectedTabIdsFromMarks(rows, "window", [], [1], []),
      [9, 3, 8]
    )
    assert.deepEqual(
      computeSelectedTabIdsFromMarks(rows, "group", [], [], ["1:7"]),
      [3, 8]
    )
  })
})
