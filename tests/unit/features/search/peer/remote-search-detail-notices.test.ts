import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extractRemoteSearchNoticeLines } from "../../../../../shared/lib/features/search/peer/remote-search-detail-notices.ts"

describe("extractRemoteSearchNoticeLines", () => {
  it("parses notices segment from detail", () => {
    const lines = extractRemoteSearchNoticeLines(
      "hits=3;notices=First notice|Second notice;extra=1"
    )
    assert.deepEqual(lines, ["First notice", "Second notice"])
  })

  it("returns empty when notices are absent", () => {
    assert.deepEqual(extractRemoteSearchNoticeLines("hits=3"), [])
  })
})
