import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createEmptyFloatBrowseState,
  isFloatBrowseStateV1,
  parseFloatBrowseState
} from "./float-browse-state-storage.ts"

describe("float-browse-state-storage", () => {
  it("parses a valid browse blob", () => {
    const parsed = parseFloatBrowseState({
      v: 1,
      navActive: true,
      navArmedByLeaf: { s1: true },
      paneFocusByLeaf: { s1: "terminal" },
      detailBarIdByLeaf: { s1: "nav" },
      modeToolbarOrderByLeaf: { s1: ["nav"] }
    })
    assert.ok(parsed !== null)
    assert.equal(parsed?.navActive, true)
    assert.equal(parsed?.navArmedByLeaf.s1, true)
    assert.equal(parsed?.paneFocusByLeaf.s1, "terminal")
  })

  it("rejects invalid versions", () => {
    assert.equal(isFloatBrowseStateV1({ v: 2, navActive: false }), false)
    assert.equal(parseFloatBrowseState(createEmptyFloatBrowseState())?.navActive, false)
  })

  it("keeps navActive true when empty state defaults are false", () => {
    const empty = createEmptyFloatBrowseState()
    assert.equal(empty.navActive, false)
    const merged = { ...empty, navActive: true, navArmedByLeaf: { s1: true } }
    const parsed = parseFloatBrowseState(merged)
    assert.equal(parsed?.navActive, true)
    assert.equal(parsed?.navArmedByLeaf.s1, true)
  })
})
