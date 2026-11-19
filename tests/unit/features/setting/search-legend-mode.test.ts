import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_SEARCH_LEGEND_MODE,
  formatSearchLegendLabel,
  normalizeSearchLegendMode,
  SEARCH_SCOPE_ICONS
} from "../../../../shared/lib/features/setting/search-legend-mode.ts"
import { searchPickerSourceLabel } from "../../../../shared/lib/features/side-picker/model/picker-entry.ts"
import type { PickerEntry } from "../../../../shared/lib/features/side-picker/model/picker-entry.ts"

describe("search legend mode", () => {
  it("defaults missing values to text", () => {
    assert.equal(normalizeSearchLegendMode(undefined), DEFAULT_SEARCH_LEGEND_MODE)
    assert.equal(normalizeSearchLegendMode("bogus"), "text")
    assert.equal(normalizeSearchLegendMode("emoji"), "emoji")
    assert.equal(normalizeSearchLegendMode("text_emoji"), "text_emoji")
  })

  it("formats scope legends for each mode", () => {
    assert.equal(formatSearchLegendLabel(["history"], "text"), "[history]")
    assert.equal(
      formatSearchLegendLabel(["history"], "emoji"),
      `[${SEARCH_SCOPE_ICONS.history}]`
    )
    assert.equal(
      formatSearchLegendLabel(["history"], "text_emoji"),
      `[${SEARCH_SCOPE_ICONS.history} history]`
    )
    assert.equal(
      formatSearchLegendLabel(["history", "page"], "text_emoji"),
      `[${SEARCH_SCOPE_ICONS.history} history, ${SEARCH_SCOPE_ICONS.page} page]`
    )
    assert.equal(
      formatSearchLegendLabel(["bookmark", "snapshot"], "emoji"),
      `[${SEARCH_SCOPE_ICONS.bookmark}, ${SEARCH_SCOPE_ICONS.snapshot}]`
    )
  })

  it("applies legend mode on picker source labels", () => {
    const entry: PickerEntry = {
      id: "1",
      source: "history",
      title: "Example",
      url: "https://example.com/",
      sources: ["history", "page"]
    }
    assert.equal(searchPickerSourceLabel(entry, "text"), "[history, page]")
    assert.equal(
      searchPickerSourceLabel(entry, "emoji"),
      `[${SEARCH_SCOPE_ICONS.history}, ${SEARCH_SCOPE_ICONS.page}]`
    )
    assert.equal(
      searchPickerSourceLabel(entry, "text_emoji"),
      `[${SEARCH_SCOPE_ICONS.history} history, ${SEARCH_SCOPE_ICONS.page} page]`
    )
  })
})
