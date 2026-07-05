import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  adjacentCandidateIndexByRect,
  nearestCandidateIndexByPoint,
  spatialDirFromDelta,
  type SpatialRect
} from "./spatial-element-nav.ts"

describe("spatial-element-nav", () => {
  const grid: SpatialRect[] = [
    { x: 0, y: 0, w: 10, h: 10 },
    { x: 20, y: 0, w: 10, h: 10 },
    { x: 0, y: 20, w: 10, h: 10 },
    { x: 20, y: 20, w: 10, h: 10 }
  ]

  it("moves right/down/left/up among a 2x2 grid", () => {
    assert.equal(adjacentCandidateIndexByRect(grid, 0, "right"), 1)
    assert.equal(adjacentCandidateIndexByRect(grid, 0, "down"), 2)
    assert.equal(adjacentCandidateIndexByRect(grid, 1, "left"), 0)
    assert.equal(adjacentCandidateIndexByRect(grid, 2, "up"), 0)
    assert.equal(adjacentCandidateIndexByRect(grid, 3, "left"), 2)
    assert.equal(adjacentCandidateIndexByRect(grid, 3, "up"), 1)
  })

  it("picks nearest center to a point", () => {
    assert.equal(nearestCandidateIndexByPoint(grid, 24, 4), 1)
    assert.equal(nearestCandidateIndexByPoint(grid, 4, 24), 2)
  })

  it("maps arrow deltas to directions", () => {
    assert.equal(spatialDirFromDelta(-1, 0), "left")
    assert.equal(spatialDirFromDelta(1, 0), "right")
    assert.equal(spatialDirFromDelta(0, -1), "up")
    assert.equal(spatialDirFromDelta(0, 1), "down")
  })
})
