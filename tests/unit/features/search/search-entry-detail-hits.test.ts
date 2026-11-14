import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { PickerEntry } from "../../../../shared/lib/features/side-picker/model/picker-entry.ts"
import {
  listSearchEntryDetailHits,
  occurrenceIndexInSnippet
} from "../../../../shared/lib/features/search/search-entry-detail-hits.ts"
import { splitTextHighlightSegments } from "../../../../shared/lib/features/side-picker/search/picker-search-needle.ts"

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

  it("marks only one needle per same-line multi-hit detail row", () => {
    const line =
      "UI — lib/features/bmxt-window/ (BmxtTerminal) entrypoints/bmxt/main.tsx"
    const entry = sampleEntry({
      source: "page",
      pageMatches: [
        { lineNo: 298, snippet: line, occurrence: 0, globalOccurrence: 0 },
        { lineNo: 298, snippet: line, occurrence: 1, globalOccurrence: 1 },
        { lineNo: 298, snippet: line, occurrence: 2, globalOccurrence: 2 }
      ]
    })
    const hits = listSearchEntryDetailHits(entry, "bmxt")
    assert.equal(hits.length, 3)
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i]!
      assert.equal(hit.highlightOccurrence, i)
      const segments = splitTextHighlightSegments(
        hit.displayText,
        "bmxt",
        hit.highlightOccurrence
      )
      const marked = segments.filter((s) => s.match)
      assert.equal(marked.length, 1, `row ${i} should mark exactly one needle`)
    }
  })
})

describe("occurrenceIndexInSnippet", () => {
  it("clamps when the snippet window dropped earlier same-line hits", () => {
    assert.equal(occurrenceIndexInSnippet("bmxt only", "bmxt", 2), 0)
    assert.equal(
      occurrenceIndexInSnippet("bmxt-window BmxtTerminal bmxt/main", "bmxt", 1),
      1
    )
  })
})

