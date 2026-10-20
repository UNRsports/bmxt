import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseSearchPageMatchesField,
  serializeSearchPageMatchesField
} from "../../../../shared/lib/features/search/search-page-matches-list-field.ts"

describe("search pageMatches ListResult field", () => {
  it("round-trips body hits including globalOccurrence", () => {
    const encoded = serializeSearchPageMatchesField([
      { lineNo: 12, snippet: "セール対象のため", occurrence: 0, globalOccurrence: 0 },
      { lineNo: 40, snippet: "別の セール対象", occurrence: 0, globalOccurrence: 1 }
    ])
    assert.ok(typeof encoded === "string")
    const decoded = parseSearchPageMatchesField(encoded)
    assert.equal(decoded?.length, 2)
    assert.equal(decoded?.[0]?.lineNo, 12)
    assert.equal(decoded?.[0]?.snippet, "セール対象のため")
    assert.equal(decoded?.[1]?.globalOccurrence, 1)
  })

  it("returns null/undefined for empty input", () => {
    assert.equal(serializeSearchPageMatchesField(undefined), null)
    assert.equal(serializeSearchPageMatchesField([]), null)
    assert.equal(parseSearchPageMatchesField(null), undefined)
    assert.equal(parseSearchPageMatchesField(""), undefined)
    assert.equal(parseSearchPageMatchesField("not-json"), undefined)
  })

  it("drops invalid array items", () => {
    const decoded = parseSearchPageMatchesField(
      JSON.stringify([{ lineNo: 1, snippet: "ok", occurrence: 0 }, { lineNo: "x" }, null])
    )
    assert.equal(decoded?.length, 1)
    assert.equal(decoded?.[0]?.snippet, "ok")
  })
})
