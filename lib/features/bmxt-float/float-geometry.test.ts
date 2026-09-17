/**
 * EN: Unit tests for float free-form geometry nudge / clamp.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clampFloatGeometry,
  defaultFloatGeometry,
  FLOAT_DEFAULT_HEIGHT,
  FLOAT_DEFAULT_WIDTH,
  FLOAT_MIN_HEIGHT,
  FLOAT_MIN_WIDTH,
  normalizeFloatGeometry,
  nudgeFloatGeometry,
  resolveFloatGeometryNudge
} from "./float-geometry.ts"

describe("float-geometry", () => {
  it("defaults to bottom-right sized rect", () => {
    const rect = defaultFloatGeometry(1000, 800)
    assert.equal(rect.width, FLOAT_DEFAULT_WIDTH)
    assert.equal(rect.height, FLOAT_DEFAULT_HEIGHT)
    assert.equal(rect.left, 1000 - FLOAT_DEFAULT_WIDTH - 16)
    assert.equal(rect.top, 800 - FLOAT_DEFAULT_HEIGHT - 16)
  })

  it("resize keeps top-left and grows bottom-right", () => {
    const base = { left: 100, top: 80, width: 400, height: 300 }
    const next = nudgeFloatGeometry(base, "resize", "ArrowRight", 1200, 900, 16)
    assert.equal(next.left, 100)
    assert.equal(next.top, 80)
    assert.equal(next.width, 416)
    assert.equal(next.height, 300)
  })

  it("resize shrink clamps at minimum size", () => {
    const base = { left: 100, top: 80, width: FLOAT_MIN_WIDTH, height: FLOAT_MIN_HEIGHT }
    const next = nudgeFloatGeometry(base, "resize", "ArrowLeft", 1200, 900, 16)
    assert.equal(next.width, FLOAT_MIN_WIDTH)
    assert.equal(next.height, FLOAT_MIN_HEIGHT)
  })

  it("move shifts top-left with size fixed", () => {
    const base = { left: 200, top: 150, width: 400, height: 300 }
    const next = nudgeFloatGeometry(base, "move", "ArrowUp", 1200, 900, 16)
    assert.equal(next.left, 200)
    assert.equal(next.top, 134)
    assert.equal(next.width, 400)
    assert.equal(next.height, 300)
  })

  it("clamp keeps rect inside viewport margin", () => {
    const clamped = clampFloatGeometry(
      { left: -40, top: 900, width: 520, height: 360 },
      1000,
      800
    )
    assert.equal(clamped.left, 16)
    assert.ok(clamped.top + clamped.height <= 800 - 16)
  })

  it("normalize rejects non-finite or undersized values", () => {
    assert.equal(normalizeFloatGeometry(null, 1000, 800), null)
    assert.equal(
      normalizeFloatGeometry({ left: 0, top: 0, width: 10, height: 10 }, 1000, 800),
      null
    )
  })

  it("resolveFloatGeometryNudge maps modifier combos", () => {
    assert.deepEqual(
      resolveFloatGeometryNudge({
        key: "ArrowRight",
        shiftKey: true,
        ctrlKey: true,
        metaKey: false,
        altKey: false
      }),
      { mode: "resize", arrow: "ArrowRight" }
    )
    assert.deepEqual(
      resolveFloatGeometryNudge({
        key: "ArrowLeft",
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        altKey: true
      }),
      { mode: "move", arrow: "ArrowLeft" }
    )
    assert.equal(
      resolveFloatGeometryNudge({
        key: "ArrowUp",
        shiftKey: true,
        ctrlKey: true,
        metaKey: false,
        altKey: true
      }),
      null
    )
  })
})
