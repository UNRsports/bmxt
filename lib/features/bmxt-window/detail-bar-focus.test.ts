import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computePickerColumnOrder,
  cycleDetailBarId,
  isPickerDetailBar,
  listVisibleDetailBars,
  resolveDetailBarFocusTarget
} from "./detail-bar-focus.ts"

describe("detail bar focus helpers", () => {
  it("computePickerColumnOrder moves focused slot left", () => {
    assert.deepEqual(
      computePickerColumnOrder(["tabs", "search", "dom"], "dom"),
      ["dom", "tabs", "search"]
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
