import { describe, it } from "node:test"
import assert from "node:assert/strict"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"
import {
  buildRemoteMoveOp,
  classifyPickerSelection
} from "../../../../shared/lib/features/tabs/remote-picker-ops.ts"

const rows: TabPickerRow[] = [
  {
    kind: "tab",
    tabId: 1,
    windowId: 10,
    groupId: null,
    groupColor: null,
    title: "local",
    url: "https://local.example",
    faviconSrc: null,
    active: true,
    deviceId: "localDev",
    remote: false,
    peerTabId: null,
    peerWindowId: null,
    peerGroupId: null
  },
  {
    kind: "tab",
    tabId: -2,
    windowId: -3,
    groupId: null,
    groupColor: null,
    title: "remote",
    url: "https://remote.example",
    faviconSrc: null,
    active: false,
    deviceId: "peerDev",
    remote: true,
    peerTabId: 42,
    peerWindowId: 7,
    peerGroupId: null
  },
  {
    kind: "window",
    windowId: -3,
    label: "peer win",
    windowTitle: "peer win",
    usesActiveTabTitle: false,
    focused: false,
    deviceId: "peerDev",
    remote: true,
    peerWindowId: 7
  }
]

describe("classifyPickerSelection", () => {
  it("classifies local vs remote vs mixed", () => {
    assert.equal(classifyPickerSelection(rows, [1]).kind, "local")
    assert.equal(classifyPickerSelection(rows, [-2]).kind, "remote")
    assert.equal(classifyPickerSelection(rows, [1, -2]).kind, "mixed")
  })
})

describe("buildRemoteMoveOp", () => {
  it("builds beforeTabId move for tab targets", () => {
    const op = buildRemoteMoveOp(rows, [42], {
      targetKind: "tab",
      targetTabId: -2,
      targetWindowId: null,
      targetGroupId: null,
      shouldUngroupAfterMove: false,
      shouldGroupToTargetAfterMove: false
    })
    assert.ok(op)
    assert.equal(op!.kind, "move")
    if (op!.kind === "move") {
      assert.equal(op.beforeTabId, 42)
      assert.equal(op.windowId, 7)
      assert.deepEqual(op.tabIds, [42])
    }
  })
})
