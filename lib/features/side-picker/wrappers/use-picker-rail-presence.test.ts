import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveVisibleRailPickers } from "./use-picker-rail-presence.ts"

describe("resolveVisibleRailPickers", () => {
  it("prefers live openPickers when any slot is open", () => {
    assert.deepEqual(
      resolveVisibleRailPickers(["dom", "tabs"], []),
      ["dom", "tabs"]
    )
  })

  it("falls back to railPickers during close animation", () => {
    assert.deepEqual(resolveVisibleRailPickers([], ["dom"]), ["dom"])
  })

  it("returns empty when both are empty", () => {
    assert.deepEqual(resolveVisibleRailPickers([], []), [])
  })
})
