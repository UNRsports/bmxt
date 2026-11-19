import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { bookmarkParentCompletionZone } from "../../../../shared/lib/features/bookmark/parent-completion.ts"

describe("bookmarkParentCompletionZone", () => {
  it("detects the value token after --parent", () => {
    const line = "bookmark -add https://example.com --parent "
    const zone = bookmarkParentCompletionZone(line, line.length)
    assert.ok(zone !== null)
    assert.equal(zone!.prefix, "")
    assert.equal(zone!.valueStart, line.length)
  })

  it("returns the typed prefix inside the parent value", () => {
    const line = "bookmark -add https://example.com --parent 12"
    const zone = bookmarkParentCompletionZone(line, line.length)
    assert.ok(zone !== null)
    assert.equal(zone!.prefix, "12")
  })

  it("returns null before --parent value", () => {
    const line = "bookmark -add https://example.com --par"
    assert.equal(bookmarkParentCompletionZone(line, line.length), null)
  })

  it("works on a pipe consumer stage", () => {
    const line = "tab -list | bookmark -add --parent "
    const zone = bookmarkParentCompletionZone(line, line.length)
    assert.ok(zone !== null)
    assert.equal(zone!.prefix, "")
  })
})
