import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSearchListResult } from "../../../../lib/features/search/search-list-result.ts"
import type { PickerEntry } from "../../../../lib/features/side-picker/model/picker-entry.ts"

describe("buildSearchListResult", () => {
  it("maps picker entries to search.hit records", () => {
    const entries: PickerEntry[] = [
      {
        id: "history-0",
        source: "history",
        title: "Example",
        url: "https://example.com/"
      }
    ]
    const result = buildSearchListResult(entries, "ex")
    assert.equal(result.schema, "bmxt-list/1")
    assert.equal(result.command, "search")
    assert.equal(result.records.length, 1)
    assert.equal(result.records[0]!.kind, "search.hit")
    assert.equal(result.records[0]!.fields.source, "history")
    assert.match(result.records[0]!.display?.label ?? "", /Example/)
  })

  it("keeps adapter notice lines when there are no openable hits", () => {
    const result = buildSearchListResult([], "privacy", [
      "(no history matches — pattern is case-insensitive substring, or empty pattern for all)",
      "(no bookmark matches — pattern is case-insensitive substring, or empty pattern for all)"
    ])
    assert.equal(result.records.length, 2)
    assert.equal(result.records[0]!.fields.source, "notice")
    assert.match(result.records[0]!.display?.label ?? "", /no history matches/)
  })

  it("serializes pageMatchesJson for picker detail / highlight round-trip", () => {
    const entries: PickerEntry[] = [
      {
        id: "page-1",
        source: "page",
        title: "Doc",
        url: "https://example.com/doc",
        tabId: 4,
        windowId: 1,
        pageMatches: [{ lineNo: 3, snippet: "hello needle here", occurrence: 0, globalOccurrence: 0 }]
      }
    ]
    const result = buildSearchListResult(entries, "needle")
    assert.equal(result.records[0]!.fields.hitCount, 1)
    assert.equal(result.records[0]!.fields.windowId, 1)
    assert.equal(typeof result.records[0]!.fields.pageMatchesJson, "string")
    assert.match(String(result.records[0]!.fields.pageMatchesJson), /hello needle here/)
  })
})

