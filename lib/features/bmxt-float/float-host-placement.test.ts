import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cornerToRect,
  FLOAT_DEFAULT_CORNER,
  inflateRect,
  pickFloatCorner,
  rectsOverlap
} from "./float-host-placement.ts"

describe("float-host-placement", () => {
  it("maps corners into viewport with margin", () => {
    const br = cornerToRect("bottom-right", 1000, 800, 520, 360, 16)
    assert.equal(br.left, 1000 - 520 - 16)
    assert.equal(br.top, 800 - 360 - 16)

    const tl = cornerToRect("top-left", 1000, 800, 520, 360, 16)
    assert.equal(tl.left, 16)
    assert.equal(tl.top, 16)
  })

  it("detects overlap after inflate", () => {
    const floatRect = { left: 464, top: 424, width: 520, height: 360 }
    const nav = { left: 900, top: 700, width: 40, height: 40 }
    assert.equal(rectsOverlap(floatRect, nav), true)
    const padded = inflateRect(nav, 28)
    assert.equal(rectsOverlap(floatRect, padded), true)
  })

  it("keeps default corner when no obstacles", () => {
    const next = pickFloatCorner({
      current: FLOAT_DEFAULT_CORNER,
      viewportWidth: 1200,
      viewportHeight: 900,
      floatWidth: 520,
      floatHeight: 360,
      obstacles: []
    })
    assert.equal(next, "bottom-right")
  })

  it("moves away from bottom-right when nav occupies that corner", () => {
    const floatAtBr = cornerToRect("bottom-right", 1200, 900, 520, 360, 16)
    const obstacle = inflateRect(
      {
        left: floatAtBr.left + 40,
        top: floatAtBr.top + 40,
        width: 80,
        height: 80
      },
      28
    )
    const next = pickFloatCorner({
      current: "bottom-right",
      viewportWidth: 1200,
      viewportHeight: 900,
      floatWidth: 520,
      floatHeight: 360,
      obstacles: [obstacle]
    })
    assert.notEqual(next, "bottom-right")
    const nextRect = cornerToRect(next, 1200, 900, 520, 360, 16)
    assert.equal(rectsOverlap(nextRect, obstacle), false)
  })
})
