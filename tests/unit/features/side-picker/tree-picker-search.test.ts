import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  treePickerHighlightSegments,
  treePickerViewMatchesNeedle,
  treePickerVisibleHiIndicesMatching
} from "../../../../shared/lib/features/side-picker/tree/tree-picker-search.ts"
import type { TreePickerRowView } from "../../../../shared/lib/features/side-picker/tree/tree-picker-types.ts"

function view(
  partial: Partial<TreePickerRowView> & Pick<TreePickerRowView, "domKey" | "variant" | "label">
): TreePickerRowView {
  return {
    foldable: partial.variant !== "tab",
    expanded: true,
    marked: false,
    detail: null,
    indent: 0,
    ...partial
  }
}

const VIEWS: TreePickerRowView[] = [
  view({ domKey: "m", variant: "window", label: "November 2026" }),
  view({ domKey: "d", variant: "group", label: "Thu, Nov 20, 2026" }),
  view({
    domKey: "v",
    variant: "tab",
    label: "Example Title",
    detail: "https://example.com/path",
    indent: 1
  })
]

describe("treePickerViewMatchesNeedle", () => {
  it("matches leaf title in non-@ mode and URL in @ mode", () => {
    const leaf = VIEWS[2]!
    assert.equal(treePickerViewMatchesNeedle(leaf, false, "example title"), true)
    assert.equal(treePickerViewMatchesNeedle(leaf, false, "example.com"), false)
    assert.equal(treePickerViewMatchesNeedle(leaf, true, "example.com"), true)
    assert.equal(treePickerViewMatchesNeedle(leaf, true, "example title"), false)
  })

  it("matches headers only in non-@ mode", () => {
    const month = VIEWS[0]!
    assert.equal(treePickerViewMatchesNeedle(month, false, "november"), true)
    assert.equal(treePickerViewMatchesNeedle(month, true, "november"), false)
  })
})

describe("treePickerVisibleHiIndicesMatching", () => {
  it("returns matching view indices for n/N", () => {
    assert.deepEqual(treePickerVisibleHiIndicesMatching(VIEWS, "Example"), [2])
    assert.deepEqual(treePickerVisibleHiIndicesMatching(VIEWS, "@example.com"), [2])
    assert.deepEqual(treePickerVisibleHiIndicesMatching(VIEWS, "November"), [0])
    assert.deepEqual(treePickerVisibleHiIndicesMatching(VIEWS, ""), [])
  })
})

describe("treePickerHighlightSegments", () => {
  it("highlights label or detail according to @ mode", () => {
    const labelSegs = treePickerHighlightSegments("Example Title", "Example", "label")
    assert.equal(labelSegs.some((s) => s.match), true)
    const detailPlain = treePickerHighlightSegments("https://example.com", "Example", "detail")
    assert.equal(detailPlain.every((s) => !s.match), true)
    const detailHl = treePickerHighlightSegments("https://example.com", "@example.com", "detail")
    assert.equal(detailHl.some((s) => s.match), true)
  })
})
