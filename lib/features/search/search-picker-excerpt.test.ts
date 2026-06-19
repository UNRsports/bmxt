import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { excerptAroundNeedle, excerptAroundNeedleWithHighlight } from "./search-picker-excerpt.ts"

describe("excerptAroundNeedle", () => {
  it("centers on a case-insensitive needle with ellipsis", () => {
    const text =
      "prefix-" + "x".repeat(60) + "ベンチマーク" + "y".repeat(60) + "-suffix"
    const out = excerptAroundNeedle(text, "ベンチ", 10)
    assert.ok(out.includes("ベンチ"))
    assert.ok(out.startsWith("…"))
    assert.ok(out.endsWith("…"))
  })

  it("returns full short text when needle is empty", () => {
    assert.equal(excerptAroundNeedle("short line", ""), "short line")
  })

  it("centers on the nth occurrence for highlight index", () => {
    const text = "aaa foo bbb foo ccc"
    const second = excerptAroundNeedleWithHighlight(text, "foo", 8, 1)
    assert.ok(second.text.includes("bbb foo ccc"))
    assert.equal(second.highlightOccurrence, 1)
  })
})
