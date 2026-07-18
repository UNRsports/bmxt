/**
 * EN: Golden wire tests — TS camelCase JSON shapes must round-trip through WASM tabs-picker APIs.
 * JA: TS 側 camelCase JSON が WASM tabs-picker API で往復できることのゴールデンテスト。
 */

import assert from "node:assert/strict"
import { describe, it, before } from "node:test"
import { ensureBmxtCoreForTests } from "../test-ensure-wasm.ts"
import {
  wasmTabsPickerConfirmPlan,
  wasmTabsPickerCreateGroupPlan,
  wasmTabsPickerReduce
} from "../wasm-host.ts"
import { parseWasmJson } from "./parse-wasm-json.ts"

const emptyStateJson = JSON.stringify({
  hi: 0,
  moveDestHi: 0,
  markedKind: null,
  markedTabIds: [],
  markedWindowIds: [],
  markedGroupKeys: [],
  bulkSubMode: null
})

describe("tabs-picker WASM wire (camelCase)", () => {
  before(() => {
    ensureBmxtCoreForTests()
  })

  it("moveHi with visibleLen updates hi", () => {
    const raw = wasmTabsPickerReduce(
      emptyStateJson,
      JSON.stringify({ kind: "moveHi", delta: 2, visibleLen: 10 })
    )
    const next = parseWasmJson<{ hi: number }>(raw)
    assert.equal(next.hi, 2)
  })

  it("confirm plan returns camelCase tabId/windowId", () => {
    const raw = wasmTabsPickerConfirmPlan(
      JSON.stringify({
        hi: 0,
        rows: [{ kind: "tab", tabId: 11, windowId: 3 }]
      })
    )
    const plan = parseWasmJson<{
      kind: string
      tabId: number
      windowId: number
    } | null>(raw)
    assert.ok(plan)
    assert.equal(plan.kind, "activateTab")
    assert.equal(plan.tabId, 11)
    assert.equal(plan.windowId, 3)
  })

  it("create-group domain failure keeps ok:false error without throwing", () => {
    const raw = wasmTabsPickerCreateGroupPlan(
      JSON.stringify({
        tabCount: 0,
        resolvedTabCount: 0,
        sameWindow: true,
        windowType: "normal",
        groupTabCount: 0,
        movingCount: 0
      })
    )
    const result = parseWasmJson<{
      ok: boolean
      error: string | null
      strategy: string | null
    }>(raw)
    assert.equal(result.ok, false)
    assert.ok(result.error)
    assert.equal(result.strategy, null)
  })
})
