import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { matchPlainListCommand } from "./registry.ts"

describe("list-commands registry", () => {
  it("matches plain tabs -list", () => {
    const matched = matchPlainListCommand("tabs -list")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "tabs")
  })

  it("matches tabs -list -url", () => {
    const matched = matchPlainListCommand("tabs -list -url")
    assert.notEqual(matched, null)
    assert.deepEqual(matched!.match, { showUrl: true })
  })

  it("rejects unknown tokens on tabs -list", () => {
    assert.equal(matchPlainListCommand("tabs -list --picker"), null)
  })

  it("matches plain search -list", () => {
    const matched = matchPlainListCommand("search -list foo")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "search")
  })
})
