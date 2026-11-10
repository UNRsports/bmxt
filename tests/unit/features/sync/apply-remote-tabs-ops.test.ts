import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { applyRemoteTabsOps } from "../../../../shared/lib/features/sync/bus/apply-remote-tabs-ops.ts"

describe("applyRemoteTabsOps validation", () => {
  it("rejects empty move tab ids", async () => {
    const result = await applyRemoteTabsOps({
      kind: "move",
      tabIds: [],
      windowId: 1,
      index: -1,
      beforeTabId: null,
      groupId: null,
      ungroup: false,
      groupAfter: false
    })
    assert.equal(result.ok, false)
    assert.equal(result.detail, "bad_move_args")
  })

  it("rejects negative activate ids", async () => {
    const result = await applyRemoteTabsOps({
      kind: "activate",
      tabId: -1,
      windowId: 1
    })
    assert.equal(result.ok, false)
    assert.equal(result.detail, "bad_activate_args")
  })
})
