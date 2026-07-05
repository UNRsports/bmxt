import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { BMXT_RULE_SCHEMA } from "../../../bmxt-rule/types.ts"
import { bmxtRuleStreamFromListResult } from "../../../bmxt-rule/adapters/from-list-result.ts"
import { CLOSE_ACCEPTS_BMXT_RULE_KINDS } from "./close-match.ts"
import { bmxtRuleStreamAcceptsKinds } from "./stream-accepts-kinds.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../../list-output/types.ts"

function listResult(kinds: ListResult["records"][number]["kind"][]): ListResult {
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "tabs",
    subcommand: "-list",
    records: kinds.map((kind) => ({ kind, fields: kind === "tabs.tab" ? { tabId: 1 } : {} }))
  }
}

describe("bmxtRuleStreamAcceptsKinds", () => {
  it("accepts empty stdin", () => {
    const stream = bmxtRuleStreamFromListResult(listResult([]))
    assert.equal(bmxtRuleStreamAcceptsKinds(stream, CLOSE_ACCEPTS_BMXT_RULE_KINDS), true)
  })

  it("accepts when at least one page.open record exists", () => {
    const stream = bmxtRuleStreamFromListResult(listResult(["tabs.window", "tabs.tab"]))
    assert.equal(bmxtRuleStreamAcceptsKinds(stream, CLOSE_ACCEPTS_BMXT_RULE_KINDS), true)
    assert.equal(stream.records.some((record) => record.kind === "page.open"), true)
  })

  it("rejects incompatible kinds", () => {
    const sessions: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "session",
      subcommand: "-list",
      records: [{ kind: "session.row", fields: {} }]
    }
    const stream = bmxtRuleStreamFromListResult(sessions)
    assert.equal(bmxtRuleStreamAcceptsKinds(stream, CLOSE_ACCEPTS_BMXT_RULE_KINDS), false)
    assert.equal(stream.schema, BMXT_RULE_SCHEMA)
  })
})
