import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { matchPlainListCommand } from "./registry.ts"

describe("list-commands registry", () => {
  it("matches plain tab -list", () => {
    const matched = matchPlainListCommand("tab -list")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "tabs")
  })

  it("matches tab -list -url", () => {
    const matched = matchPlainListCommand("tab -list -url")
    assert.notEqual(matched, null)
    assert.deepEqual(matched!.match, { showUrl: true })
  })

  it("rejects unknown tokens on tab -list", () => {
    assert.equal(matchPlainListCommand("tab -list --picker"), null)
  })

  it("matches plain search -list", () => {
    const matched = matchPlainListCommand("search -list foo")
    assert.notEqual(matched, null)
    assert.equal(matched!.entry.id, "search")
  })
})
