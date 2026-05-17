/** EN: Kernel unit tests (plain Node, no TS import graph). */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

function pickerSearchJumpDirection(e) {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
    return null
  }
  if (e.key === "n" && !e.shiftKey) {
    return "forward"
  }
  if (e.key === "N" && e.shiftKey) {
    return "backward"
  }
  return null
}

function computePickerSearchJumpTarget(hi, matches, forward) {
  if (matches.length === 0) {
    return hi
  }
  if (forward) {
    const nextAhead = matches.find((i) => i > hi)
    return nextAhead ?? matches[0]
  }
  let prevBehind
  for (const i of matches) {
    if (i < hi) {
      prevBehind = i
    } else {
      break
    }
  }
  return prevBehind ?? matches[matches.length - 1]
}

describe("pickerSearchJumpDirection", () => {
  it("maps n and N", () => {
    assert.equal(pickerSearchJumpDirection({ key: "n", shiftKey: false }), "forward")
    assert.equal(pickerSearchJumpDirection({ key: "N", shiftKey: true }), "backward")
    assert.equal(pickerSearchJumpDirection({ key: "x", shiftKey: false }), null)
  })
})

describe("computePickerSearchJumpTarget", () => {
  it("wraps forward at end", () => {
    assert.equal(computePickerSearchJumpTarget(2, [0, 1, 2], true), 0)
  })

  it("wraps backward at start", () => {
    assert.equal(computePickerSearchJumpTarget(0, [0, 1, 2], false), 2)
  })
})
