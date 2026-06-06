import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { pickerEntriesFromSearchLines } from "./from-search-lines.ts"

describe("pickerEntriesFromSearchLines", () => {
  it("parses a history block", () => {
    const entries = pickerEntriesFromSearchLines([
      "[history]",
      "title: Example",
      "url: https://example.com",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.url, "https://example.com")
    assert.equal(entries[0]!.title, "Example")
    assert.equal(entries[0]!.source, "history")
  })

  it("skips blocks without http(s) url", () => {
    const entries = pickerEntriesFromSearchLines([
      "[bookmark]",
      "title: No URL",
      ""
    ])
    assert.equal(entries.length, 0)
  })

  it("groups page matches per tab with tabId", () => {
    const entries = pickerEntriesFromSearchLines([
      "[page]",
      "tabId: 42",
      "windowId: 7",
      "title: Login",
      "url: https://example.com/app",
      "match: L10: please ログイン here",
      "match: L22: ログイン form",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.tabId, 42)
    assert.equal(entries[0]!.windowId, 7)
    assert.equal(entries[0]!.pageMatches?.length, 2)
    assert.equal(entries[0]!.pageMatches![0]!.lineNo, 10)
    assert.equal(entries[0]!.pageMatches![1]!.occurrence, 0)
  })
})
