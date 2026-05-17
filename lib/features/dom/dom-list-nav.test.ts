import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { adjacentDomFocusHi, firstFocusableDomLineIndex } from "./dom-list-nav.ts"

describe("dom-list-nav", () => {
  it("finds first focusable line", () => {
    const paths = [null, null, [0], [0, 1]] as const
    assert.equal(firstFocusableDomLineIndex(paths), 2)
  })

  it("skips non-jumpable lines when moving", () => {
    const paths = [null, [0], [0, 1], null] as const
    assert.equal(adjacentDomFocusHi(1, 1, paths, 4), 2)
    assert.equal(adjacentDomFocusHi(2, -1, paths, 4), 1)
  })
})
