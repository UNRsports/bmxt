import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  answerAfterLockedPrefix,
  clampPromptLockedPrefix,
  lockedPrefixBlocksDelete
} from "./prompt-locked-prefix.ts"

const PREFIX = "Close this tab? [y/n]:"

describe("clampPromptLockedPrefix", () => {
  it("keeps a valid line and clamps caret into the answer zone", () => {
    const out = clampPromptLockedPrefix(PREFIX + "y", 0, PREFIX)
    assert.equal(out.line, PREFIX + "y")
    assert.equal(out.cursor, PREFIX.length)
  })

  it("restores prefix when deletion eats into the locked region", () => {
    const partial = PREFIX.slice(0, 5)
    const out = clampPromptLockedPrefix(partial, partial.length, PREFIX)
    assert.equal(out.line, PREFIX)
    assert.equal(out.cursor, PREFIX.length)
  })

  it("treats select-all replace as answer-only", () => {
    const out = clampPromptLockedPrefix("y", 1, PREFIX)
    assert.equal(out.line, PREFIX + "y")
    assert.equal(out.cursor, (PREFIX + "y").length)
  })

  it("drops a stale command line instead of concatenating it", () => {
    const out = clampPromptLockedPrefix("close", 5, PREFIX)
    assert.equal(out.line, PREFIX)
    assert.equal(out.cursor, PREFIX.length)
  })
})

describe("lockedPrefixBlocksDelete", () => {
  it("blocks backspace at the prefix boundary", () => {
    assert.equal(
      lockedPrefixBlocksDelete(PREFIX, PREFIX.length, PREFIX.length, "deleteContentBackward"),
      true
    )
  })

  it("allows backspace in the answer", () => {
    assert.equal(
      lockedPrefixBlocksDelete(
        PREFIX,
        PREFIX.length + 1,
        PREFIX.length + 1,
        "deleteContentBackward"
      ),
      false
    )
  })

  it("blocks selection that overlaps the prefix", () => {
    assert.equal(
      lockedPrefixBlocksDelete(PREFIX, PREFIX.length - 2, PREFIX.length + 1, "deleteByCut"),
      true
    )
  })
})

describe("answerAfterLockedPrefix", () => {
  it("returns the editable suffix", () => {
    assert.equal(answerAfterLockedPrefix(PREFIX + "n", PREFIX), "n")
    assert.equal(answerAfterLockedPrefix(PREFIX, PREFIX), "")
  })
})
