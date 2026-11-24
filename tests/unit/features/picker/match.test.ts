import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import { ensureBmxtCoreForTests } from "../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import { isBrowsePipeConsumer, BROWSE_ACCEPTS_BMXT_RULE_KINDS } from "../../../../shared/lib/features/command-line/pipe/consumers/browse-match.ts"
import { resolvePickerFamily } from "../../../../shared/lib/features/picker/resolve-family.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../../../../shared/lib/features/command-line/list-output/types.ts"

before(() => {
  ensureBmxtCoreForTests()
})

describe("browse pipe consumer match", () => {
  it("matches bare browse", () => {
    assert.equal(isBrowsePipeConsumer("browse"), true)
    assert.equal(isBrowsePipeConsumer("  BROWSE  "), true)
  })

  it("rejects prefix or extra args", () => {
    assert.equal(isBrowsePipeConsumer("browse tab -list"), false)
    assert.equal(isBrowsePipeConsumer("tab -list | browse"), false)
  })

  it("accepts all list-derived bmxtRule kinds", () => {
    assert.ok(BROWSE_ACCEPTS_BMXT_RULE_KINDS.includes("page.open"))
    assert.ok(BROWSE_ACCEPTS_BMXT_RULE_KINDS.includes("setting.field"))
    assert.ok(BROWSE_ACCEPTS_BMXT_RULE_KINDS.includes("session.row"))
  })
})

describe("resolvePickerFamily", () => {
  it("resolves tabs family", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [
        { kind: "tabs.window", fields: {} },
        { kind: "tabs.tab", fields: { tabId: 1 } }
      ]
    }
    assert.deepEqual(resolvePickerFamily(listResult), { ok: true, family: "tabs" })
  })

  it("resolves bookmark and history families from record kinds", () => {
    const bookmarkResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "bookmark",
      subcommand: "-list",
      records: [
        { kind: "bookmark.folder", fields: {} },
        { kind: "bookmark.item", fields: {} }
      ]
    }
    assert.deepEqual(resolvePickerFamily(bookmarkResult), { ok: true, family: "bookmark" })
    const historyResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "history",
      subcommand: "-list",
      records: [
        { kind: "history.month", fields: {} },
        { kind: "history.day", fields: {} },
        { kind: "history.visit", fields: {} }
      ]
    }
    assert.deepEqual(resolvePickerFamily(historyResult), { ok: true, family: "history" })
  })

  it("falls back to the command name for empty bookmark / history lists", () => {
    const emptyBookmark: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "bookmark",
      subcommand: "-list",
      records: []
    }
    assert.deepEqual(resolvePickerFamily(emptyBookmark), { ok: true, family: "bookmark" })
    const emptyHistory: ListResult = { ...emptyBookmark, command: "history" }
    assert.deepEqual(resolvePickerFamily(emptyHistory), { ok: true, family: "history" })
  })

  it("rejects mixed families", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [
        { kind: "tabs.tab", fields: {} },
        { kind: "search.hit", fields: {} }
      ]
    }
    assert.deepEqual(resolvePickerFamily(listResult), { ok: false, reason: "mixed" })
  })
})
