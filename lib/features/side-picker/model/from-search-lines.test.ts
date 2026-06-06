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

  it("merges history and bookmark rows with the same URL", () => {
    const entries = pickerEntriesFromSearchLines([
      "[history]",
      "title: Example",
      "url: https://example.com/",
      "",
      "[bookmark]",
      "title: Example bookmark",
      "url: https://example.com",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.deepEqual(entries[0]!.sources, ["history", "bookmark"])
    assert.equal(entries[0]!.url, "https://example.com/")
    assert.equal(entries[0]!.title, "Example")
  })

  it("labels merged row with history, bookmark, and page scopes", () => {
    const entries = pickerEntriesFromSearchLines([
      "[history]",
      "title: Docs",
      "url: https://example.com/docs",
      "",
      "[page]",
      "tabId: 9",
      "windowId: 2",
      "title: Docs",
      "url: https://example.com/docs",
      "match: L3: search term",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.deepEqual(entries[0]!.sources, ["history", "page"])
    assert.equal(entries[0]!.tabId, 9)
    assert.equal(entries[0]!.pageMatches?.length, 1)
    assert.equal(entries[0]!.source, "page")
  })

  it("merges page row when history URL differs only by query string", () => {
    const entries = pickerEntriesFromSearchLines([
      "[history]",
      "title: Article",
      "url: https://example.com/news/1",
      "",
      "[page]",
      "tabId: 3",
      "windowId: 1",
      "title: Article",
      "url: https://example.com/news/1?utm_source=foo",
      "match: L0: Article headline with ベンチ",
      ""
    ])
    assert.equal(entries.length, 1)
    assert.deepEqual(entries[0]!.sources, ["history", "page"])
    assert.equal(entries[0]!.pageMatches?.length, 1)
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
