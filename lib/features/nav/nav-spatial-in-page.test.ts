import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  navSpatialPointerForIndex,
  syncNavSpatialCursorToElement,
  syncNavSpatialSelectionIndex,
  type NavSpatialCandidates
} from "./nav-spatial-in-page.ts"

describe("nav-spatial-in-page cursor sync", () => {
  it("navSpatialPointerForIndex uses box center", () => {
    const candidates: NavSpatialCandidates = {
      paths: [[0, 1]],
      boxes: [{ x: 10, y: 20, w: 40, h: 30 }],
      metas: [
        {
          kind: "link",
          label: "link:/x",
          matchKeys: ["/x"],
          confidence: 1,
          key: "/x"
        }
      ]
    }
    assert.deepEqual(navSpatialPointerForIndex(candidates, 0), {
      x: 30,
      y: 35,
      path: [0, 1]
    })
  })

  it("syncNavSpatialCursorToElement reads live bounding rect center", () => {
    const el = {
      getBoundingClientRect() {
        return {
          left: 100,
          top: 200,
          width: 50,
          height: 20,
          right: 150,
          bottom: 220,
          x: 100,
          y: 200,
          toJSON() {
            return {}
          }
        }
      }
    } as unknown as Element

    assert.deepEqual(syncNavSpatialCursorToElement(el), {
      x: 125,
      y: 210,
      box: { x: 100, y: 200, w: 50, h: 20 }
    })
  })

  it("syncNavSpatialSelectionIndex keeps -1 when no selected path", () => {
    const candidates: NavSpatialCandidates = {
      paths: [[0], [1]],
      boxes: [
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 20, y: 0, w: 10, h: 10 }
      ],
      metas: [
        {
          kind: "link",
          label: "a",
          matchKeys: ["a"],
          confidence: 1,
          key: "a"
        },
        {
          kind: "link",
          label: "b",
          matchKeys: ["b"],
          confidence: 1,
          key: "b"
        }
      ]
    }
    assert.equal(syncNavSpatialSelectionIndex(candidates, null), -1)
  })
})
