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
  it("appends | browse when picking browse over setting -list", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("setting -list", 0, "browse"), {
      line: "setting -list | browse",
      cursor: "setting -list | browse".length
    })
  })

  it("drops spaced filter prefix pi then appends | browse", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("pi setting -list", 2, "browse"), {
      line: "setting -list | browse",
      cursor: "setting -list | browse".length
    })
  })

  it("drops merged filter prefix pi then appends | browse", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("pisetting -list", 2, "browse"), {
      line: "setting -list | browse",
      cursor: "setting -list | browse".length
    })
  })

  it("still prepends non-browse first tokens", () => {
    assert.deepEqual(buildFirstTierPrependPickLine("setting -list", 0, "help"), {
      line: "help setting -list",
      cursor: 5
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
