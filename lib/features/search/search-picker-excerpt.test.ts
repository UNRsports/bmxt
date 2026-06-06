import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { excerptAroundNeedle } from "./search-picker-excerpt.ts"

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
})
