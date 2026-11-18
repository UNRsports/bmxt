import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import {
  bookmarkAddItemsFromBmxtRuleStream,
  parseBookmarkAddPipeSegment
} from "../../../../../shared/lib/features/command-line/pipe/consumers/bookmark-add-match.ts"
import type { BmxtRuleStream } from "../../../../../shared/lib/features/bmxt-rule/types.ts"

ensureBmxtCoreForTests()

describe("parseBookmarkAddPipeSegment", () => {
  it("matches bare bookmark -add", () => {
    const flags = parseBookmarkAddPipeSegment("bookmark -add")
    assert.deepEqual(flags, { parentId: null, dupMode: "" })
  })

  it("parses --parent and --skip-dup", () => {
    const flags = parseBookmarkAddPipeSegment("bookmark -add --parent 42 --skip-dup")
    assert.deepEqual(flags, { parentId: "42", dupMode: "skip" })
  })

  it("rejects unknown flags", () => {
    assert.equal(parseBookmarkAddPipeSegment("bookmark -add --nope"), null)
  })
})

describe("bookmarkAddItemsFromBmxtRuleStream", () => {
  it("extracts page.open url and pageTitle with URL dedupe", () => {
    const stream: BmxtRuleStream = {
      schema: "bmxt-rule/1",
      producer: { command: "tab", second: "-list" },
      records: [
        {
          kind: "page.open",
          entries: [
            ["url", "https://example.com/a"],
            ["pageTitle", "Alpha"]
          ]
        },
        {
          kind: "page.open",
          entries: [
            ["url", "https://example.com/a"],
            ["pageTitle", "Dup"]
          ]
        },
        {
          kind: "page.open",
          entries: [
            ["url", "https://example.com/b"],
            ["pageTitle", "Beta"]
          ]
        }
      ]
    }
    const items = bookmarkAddItemsFromBmxtRuleStream(stream)
    assert.deepEqual(items, [
      { url: "https://example.com/a", title: "Alpha" },
      { url: "https://example.com/b", title: "Beta" }
    ])
  })
})
