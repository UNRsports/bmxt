import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { shouldRunPickerAltPreview } from "../../../../shared/lib/features/side-picker/preview/picker-alt-preview-mode.ts"
import {
  SEARCH_DETAIL_AUTO_PREVIEW_DEBOUNCE_MS,
  SEARCH_DETAIL_MANUAL_PREVIEW_DEBOUNCE_MS
} from "../../../../shared/lib/features/search/search-detail-preview-config.ts"

describe("search detail auto preview", () => {
  it("debounces detail auto longer than detail manual sync", () => {
    assert.ok(SEARCH_DETAIL_AUTO_PREVIEW_DEBOUNCE_MS >= SEARCH_DETAIL_MANUAL_PREVIEW_DEBOUNCE_MS)
    assert.equal(SEARCH_DETAIL_AUTO_PREVIEW_DEBOUNCE_MS, 180)
  })

  it("runs preview on highlight move when page-active is auto", () => {
    assert.equal(shouldRunPickerAltPreview("auto", false), true)
    assert.equal(shouldRunPickerAltPreview("manual", false), false)
    assert.equal(shouldRunPickerAltPreview("manual", true), true)
  })
})
