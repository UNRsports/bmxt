import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isBrowsePipeConsumer, BROWSE_ACCEPTS_BMXT_RULE_KINDS } from "../../../../shared/lib/features/command-line/pipe/consumers/browse-match.ts"
import { resolvePickerFamily } from "../../../../shared/lib/features/picker/resolve-family.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../../../../shared/lib/features/command-line/list-output/types.ts"

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
