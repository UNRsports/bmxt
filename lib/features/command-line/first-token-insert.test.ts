import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildFirstTierPrependPickLine,
  isFirstTierPrependPick,
  shouldInsertTokenPickAtCursor
} from "./first-token-insert.ts"

describe("isFirstTierPrependPick", () => {
  it("detects prepend at line start before an existing command", () => {
    assert.equal(isFirstTierPrependPick("setting -list", 0, "first"), true)
  })

  it("detects spaced incremental filter before the tail command", () => {
    assert.equal(isFirstTierPrependPick("pi setting -list", 2, "first"), true)
  })

  it("detects merged incremental filter before the tail command", () => {
    assert.equal(isFirstTierPrependPick("pisetting -list", 2, "first"), true)
  })

  it("does not treat in-place first-command edit as prepend", () => {
    assert.equal(isFirstTierPrependPick("search -list", 3, "first"), false)
  })

  it("does not apply to second-tier picks", () => {
    assert.equal(isFirstTierPrependPick("setting -list", 8, "second"), false)
  })
})

describe("buildFirstTierPrependPickLine", () => {
  it("prepends picker before setting -list from line start", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("setting -list", 0, "picker"), {
      line: "picker setting -list",
      cursor: 7
    })
  })

  it("drops spaced filter prefix pi", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("pi setting -list", 2, "picker"), {
      line: "picker setting -list",
      cursor: 7
    })
  })

  it("drops merged filter prefix pi", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("pisetting -list", 2, "picker"), {
      line: "picker setting -list",
      cursor: 7
    })
  })
})

describe("shouldInsertTokenPickAtCursor", () => {
  it("delegates to prepend detection", () => {
    assert.equal(shouldInsertTokenPickAtCursor("pi setting -list", 2, 0, 2, "first"), true)
  })

  it("replaces when only one token remains on the line", () => {
    assert.equal(shouldInsertTokenPickAtCursor("setting", 0, 0, 7, "first"), false)
  })
})
