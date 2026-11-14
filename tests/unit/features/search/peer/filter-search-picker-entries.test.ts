import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { filterSearchPickerEntries } from "../../../../../shared/lib/features/search/peer/filter-search-picker-entries.ts"
import type { PickerEntry } from "../../../../../shared/lib/features/side-picker/model/picker-entry.ts"

function entry(partial: Partial<PickerEntry> & Pick<PickerEntry, "id" | "title" | "url">): PickerEntry {
  return {
    source: "history",
    ...partial
  }
}

describe("filterSearchPickerEntries", () => {
  const rows = [
    entry({ id: "1", title: "Rust Book", url: "https://doc.rust-lang.org/book/" }),
    entry({ id: "2", title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/" }),
    entry({ id: "3", title: "Other", url: "https://example.com/rust-notes" })
  ]

  it("returns all entries for empty needle", () => {
    assert.deepEqual(filterSearchPickerEntries(rows, "   "), rows)
  })

  it("filters by title or url substring", () => {
    const filtered = filterSearchPickerEntries(rows, "rust")
    assert.deepEqual(
      filtered.map((e) => e.id),
      ["1", "3"]
    )
  })

  it("filters url-only with @ prefix", () => {
    const filtered = filterSearchPickerEntries(rows, "@typescriptlang")
    assert.deepEqual(
      filtered.map((e) => e.id),
      ["2"]
    )
  })
})
