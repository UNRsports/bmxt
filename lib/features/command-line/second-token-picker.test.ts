import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveSecondTokenPickerHit } from "./second-token-picker.ts"

describe("resolveSecondTokenPickerHit", () => {
  it("offers second heads for complete first command without trailing space", () => {
    const line = "tab"
    const hit = resolveSecondTokenPickerHit(line, line.length, "prefix")
    assert.ok(hit)
    assert.equal(hit!.tier, "second")
    assert.equal(hit!.tokenStart, line.length)
    assert.equal(hit!.prefix, "")
    assert.ok(hit!.candidates.includes("-list"))
    assert.ok(!hit!.candidates.includes("-close"))
    assert.ok(!hit!.candidates.includes("-reload"))
  })

  it("offers second heads after trailing space", () => {
    const line = "tab "
    const hit = resolveSecondTokenPickerHit(line, line.length, "prefix")
    assert.ok(hit)
    assert.equal(hit!.tier, "second")
    assert.ok(hit!.candidates.includes("-list"))
  })

  it("returns null for a complete second with no third tokens", () => {
    const line = "tab -nowurl"
    assert.equal(resolveSecondTokenPickerHit(line, line.length, "prefix"), null)
  })
})
