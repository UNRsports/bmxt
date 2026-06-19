import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"
import { listSearchEntryDetailHits } from "./search-entry-detail-hits.ts"

function sampleEntry(overrides: Partial<PickerEntry> = {}): PickerEntry {
  return {
    id: "e1",
    source: "history",
    title: "Example Title",
    url: "https://example.com/path",
    tabId: 42,
    ...overrides
  }
}

describe("listSearchEntryDetailHits", () => {
  it("returns no detail rows when pattern is empty", () => {
    assert.deepEqual(listSearchEntryDetailHits(sampleEntry(), ""), [])
    assert.deepEqual(listSearchEntryDetailHits(sampleEntry(), "   "), [])
  })

  it("returns no detail rows for page preview matches when pattern is empty", () => {
    const entry = sampleEntry({
      source: "page",
      pageMatches: [
        { lineNo: 1, snippet: "first preview line", occurrence: 0 },
        { lineNo: 2, snippet: "second preview line", occurrence: 0 }
      ]
    })
    assert.deepEqual(listSearchEntryDetailHits(entry, ""), [])
  })

  it("lists page body hits when pattern is specified", () => {
    const entry = sampleEntry({
      source: "page",
      pageMatches: [
        { lineNo: 1, snippet: "hello world", occurrence: 0 },
        { lineNo: 2, snippet: "another hello", occurrence: 0 }
      ]
    })
    const hits = listSearchEntryDetailHits(entry, "hello")
    assert.equal(hits.length, 2)
    assert.equal(hits[0]?.field, "text")
    assert.match(hits[0]?.displayText ?? "", /^L1:/)
  })

  it("lists title and url fallbacks when pattern matches and there are no page matches", () => {
    const hits = listSearchEntryDetailHits(sampleEntry(), "example")
    assert.equal(hits.length, 2)
    assert.deepEqual(
      hits.map((h) => h.field),
      ["title", "url"]
    )
  })
})
