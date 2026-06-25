import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveMovePlan } from "./execute-plan.ts"

describe("resolveMovePlan", () => {
  it("groups tab selection when destination tab belongs to a group", () => {
    const plan = resolveMovePlan({
      markedKind: "tab",
      targetKind: "tab",
      targetTabId: 42,
      targetWindowId: 1,
      targetGroupId: 7
    })
    assert.ok(plan)
    assert.equal(plan.shouldGroupToTargetAfterMove, true)
    assert.equal(plan.shouldUngroupAfterMove, false)
  })

  it("ungroups tab selection when destination tab is outside any group", () => {
    const plan = resolveMovePlan({
      markedKind: "tab",
      targetKind: "tab",
      targetTabId: 42,
      targetWindowId: 1,
      targetGroupId: null
    })
    assert.ok(plan)
    assert.equal(plan.shouldGroupToTargetAfterMove, false)
    assert.equal(plan.shouldUngroupAfterMove, true)
  })

  it("groups tab selection when destination is a group row", () => {
    const plan = resolveMovePlan({
      markedKind: "tab",
      targetKind: "group",
      targetTabId: null,
      targetWindowId: 1,
      targetGroupId: 9
    })
    assert.ok(plan)
    assert.equal(plan.shouldGroupToTargetAfterMove, true)
    assert.equal(plan.shouldUngroupAfterMove, false)
  })

  it("keeps group-selection move behavior for grouped tab targets", () => {
    const plan = resolveMovePlan({
      markedKind: "group",
      targetKind: "tab",
      targetTabId: 42,
      targetWindowId: 1,
      targetGroupId: 7,
      sourceTabGroupIds: [3]
    })
    assert.ok(plan)
    assert.equal(plan.shouldGroupToTargetAfterMove, true)
    assert.equal(plan.shouldUngroupAfterMove, false)
    assert.deepEqual(plan.tabGroupIdsToMoveAsUnits, [])
  })
})
