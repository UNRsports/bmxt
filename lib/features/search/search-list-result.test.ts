import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSearchListResult } from "./search-list-result.ts"
import type { PickerEntry } from "../side-picker/model/picker-entry.ts"

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
})

