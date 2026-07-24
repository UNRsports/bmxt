/**
 * EN: Move-plan behavior via WASM (camelCase wire).
 * JA: WASM 経由の move-plan 振る舞い（camelCase ワイヤ）。
 */

import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../test-ensure-wasm.ts"
import { resolveTabsPickerMovePlan } from "./execute-plan-wasm.ts"

type MovePlan = {
  targetKind: string
  targetTabId: number | null
  targetWindowId: number | null
  targetGroupId: number | null
  shouldUngroupAfterMove: boolean
  shouldGroupToTargetAfterMove: boolean
  tabGroupIdsToMoveAsUnits: number[]
} | null

describe("resolveTabsPickerMovePlan (WASM)", () => {
  before(() => {
    ensureBmxtCoreForTests()
  })

  it("groups tab selection when destination tab belongs to a group", () => {
    const plan = resolveTabsPickerMovePlan<
      {
        markedKind: string
        targetKind: string
        targetTabId: number
        targetWindowId: number
        targetGroupId: number
      },
      MovePlan
    >({
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
    const plan = resolveTabsPickerMovePlan<
      {
        markedKind: string
        targetKind: string
        targetTabId: number
        targetWindowId: number
        targetGroupId: null
      },
      MovePlan
    >({
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
    const plan = resolveTabsPickerMovePlan<
      {
        markedKind: string
        targetKind: string
        targetTabId: null
        targetWindowId: number
        targetGroupId: number
      },
      MovePlan
    >({
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
    const plan = resolveTabsPickerMovePlan<
      {
        markedKind: string
        targetKind: string
        targetTabId: number
        targetWindowId: number
        targetGroupId: number
        sourceTabGroupIds: number[]
      },
      MovePlan
    >({
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
