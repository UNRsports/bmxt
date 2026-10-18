import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../../../../../lib/features/command-line/list-output/types.ts"
import { buildSearchListResult } from "../../../../../lib/features/search/search-list-result.ts"
import type { PickerEntry } from "../../../../../lib/features/side-picker/model/picker-entry.ts"
import { pickerEntriesFromSearchListResult } from "../../../../../lib/features/picker/from-list-result/search-entries.ts"

describe("pickerEntriesFromSearchListResult", () => {
  it("restores pageMatches and windowId from buildSearchListResult", () => {
    const entries: PickerEntry[] = [
      {
        id: "page-tab-9",
        source: "page",
        title: "JINS product",
        url: "https://www.jins.com/example",
        tabId: 9,
        windowId: 2,
        pageMatches: [
          {
            lineNo: 88,
            snippet: "オンラインショップにてセール対象のため",
            occurrence: 0,
            globalOccurrence: 0
          }
        ]
      }
    ]
    const listResult = buildSearchListResult(entries, "セール対象")
    const restored = pickerEntriesFromSearchListResult(listResult)
    assert.equal(restored.pattern, "セール対象")
    assert.equal(restored.entries.length, 1)
    assert.equal(restored.entries[0]!.tabId, 9)
    assert.equal(restored.entries[0]!.windowId, 2)
    assert.equal(restored.entries[0]!.pageMatches?.length, 1)
    assert.equal(restored.entries[0]!.pageMatches![0]!.lineNo, 88)
    assert.match(restored.entries[0]!.pageMatches![0]!.snippet, /セール対象/)
  })

  it("still builds rows when pageMatchesJson is absent (legacy ListResult)", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "search",
      subcommand: "-list",
      records: [
        {
          kind: "search.hit",
          fields: {
            index: 1,
            source: "page",
            title: "Legacy",
            url: "https://example.com/",
            tabId: 3,
            hitCount: 2,
            pattern: "foo"
          }
        }
      ]
    }
    const restored = pickerEntriesFromSearchListResult(listResult)
    assert.equal(restored.entries.length, 1)
    assert.equal(restored.entries[0]!.tabId, 3)
    assert.equal(restored.entries[0]!.pageMatches, undefined)
  })
})
