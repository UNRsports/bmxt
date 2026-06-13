import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  searchEntryOffersOpenDestination,
  type PickerEntry
} from "../side-picker/model/picker-entry.ts"

function entry(partial: Partial<PickerEntry> & Pick<PickerEntry, "id" | "source" | "title" | "url">): PickerEntry {
  return {
    ...partial,
    id: partial.id,
    source: partial.source,
    title: partial.title,
    url: partial.url
  }
}

describe("searchEntryOffersOpenDestination", () => {
  it("returns true for history-only rows", () => {
    const row = entry({
      id: "h1",
      source: "history",
      title: "Example",
      url: "https://example.com"
    })
    assert.equal(searchEntryOffersOpenDestination(row), true)
  })

  it("returns true when history is merged with bookmark", () => {
    const row = entry({
      id: "hb1",
      source: "history",
      sources: ["history", "bookmark"],
      title: "Example",
      url: "https://example.com"
    })
    assert.equal(searchEntryOffersOpenDestination(row), true)
  })

  it("returns false for bookmark-only rows", () => {
    const row = entry({
      id: "b1",
      source: "bookmark",
      title: "Example",
      url: "https://example.com"
    })
    assert.equal(searchEntryOffersOpenDestination(row), false)
  })

  it("returns false for page-only rows", () => {
    const row = entry({
      id: "p1",
      source: "page",
      title: "Example",
      url: "https://example.com"
    })
    assert.equal(searchEntryOffersOpenDestination(row), false)
  })
})
