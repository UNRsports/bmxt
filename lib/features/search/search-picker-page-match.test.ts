import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { SearchPageMatch } from "../side-picker/model/picker-entry.ts"
import {
  pageMatchesForDisplay,
  pickPageMatchForDisplay,
  resolveSearchPickerPageMatchFromMatches
} from "./search-picker-page-match.ts"

describe("pageMatchesForDisplay", () => {
  it("prefers body line hits over title hits", () => {
    const matches: SearchPageMatch[] = [
      { lineNo: 0, snippet: "title hit", occurrence: 0 },
      { lineNo: 3, snippet: "body hit", occurrence: 0 }
    ]
    assert.deepEqual(pageMatchesForDisplay(matches), [matches[1]])
  })
})

describe("resolveSearchPickerPageMatchFromMatches", () => {
  const matches: SearchPageMatch[] = [
    { lineNo: 0, snippet: "title hit", occurrence: 0 },
    { lineNo: 3, snippet: "body a", occurrence: 0, globalOccurrence: 1 },
    { lineNo: 8, snippet: "body b", occurrence: 0, globalOccurrence: 2 }
  ]

  it("maps display matchHi to body hits", () => {
    assert.equal(pickPageMatchForDisplay(matches, 0)?.snippet, "body a")
    assert.equal(resolveSearchPickerPageMatchFromMatches(matches, 0).pageMatchIndex, 1)
    assert.equal(resolveSearchPickerPageMatchFromMatches(matches, 1).pageMatchIndex, 2)
  })
})
