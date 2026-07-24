import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computePickerColumnOrder,
  cycleDetailBarId,
  isCtrlCloseDetailBarKey,
  listVisibleDetailBars,
  resolveDetailBarFocusTarget,
  resolvePickerColumnOrder
} from "./detail-bar-focus.ts"

describe("detail bar focus helpers", () => {
  it("computePickerColumnOrder moves focused slot left", () => {
    assert.deepEqual(
      computePickerColumnOrder(["tabs", "search", "dom"], "dom"),
      ["dom", "tabs", "search"]
    )
  })

  it("resolvePickerColumnOrder keeps persisted order when highlight is null", () => {
    assert.deepEqual(
      resolvePickerColumnOrder(["tabs", "search"], null, ["search", "tabs"]),
      ["search", "tabs"]
    )
  })

  it("resolvePickerColumnOrder moves highlight left without resetting persisted base", () => {
    assert.deepEqual(
      resolvePickerColumnOrder(["tabs", "search", "dom"], "tabs", ["search", "tabs", "dom"]),
      ["tabs", "search", "dom"]
    )
  })

  it("resolvePickerColumnOrder appends newly opened pickers", () => {
    assert.deepEqual(
      resolvePickerColumnOrder(["tabs", "dom"], null, ["tabs", "search"]),
      ["tabs", "dom"]
    )
  })

  it("cycleDetailBarId wraps in stack order", () => {
    const bars = ["nav", "tabs", "search"] as const
    assert.equal(cycleDetailBarId(bars, "tabs", "down"), "search")
    assert.equal(cycleDetailBarId(bars, "nav", "up"), "search")
  })

  it("listVisibleDetailBars filters by visibility", () => {
    const order = ["nav", "tabs", "search"] as const
    assert.deepEqual(
      listVisibleDetailBars(order, (id) => id !== "nav"),
      ["tabs", "search"]
    )
  })

  it("resolveDetailBarFocusTarget prefers stored visible id", () => {
    const bars = ["nav", "tabs", "search"] as const
    assert.equal(resolveDetailBarFocusTarget(bars, "search"), "search")
    assert.equal(resolveDetailBarFocusTarget(bars, "dom"), "nav")
    assert.equal(resolveDetailBarFocusTarget([], "tabs"), null)
  })
})

describe("isCtrlCloseDetailBarKey", () => {
  it("matches Ctrl+C", () => {
    assert.equal(
      isCtrlCloseDetailBarKey({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, key: "c" }),
      true
    )
  })

  it("rejects Ctrl+Shift+C", () => {
    assert.equal(
      isCtrlCloseDetailBarKey({ ctrlKey: true, metaKey: false, altKey: false, shiftKey: true, key: "c" }),
      false
    )
  })
})
