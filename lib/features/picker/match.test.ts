import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isPickerCommandSegment, parsePickerConsumerSegment } from "./match.ts"
import { resolvePickerFamily } from "./resolve-family.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../command-line/list-output/types.ts"

describe("picker match", () => {
  it("parses picker and picker -u", () => {
    assert.deepEqual(parsePickerConsumerSegment("picker"), { showUrl: false })
    assert.deepEqual(parsePickerConsumerSegment("picker -u"), { showUrl: true })
    assert.equal(parsePickerConsumerSegment("picker --foo"), null)
    assert.equal(isPickerCommandSegment("picker"), true)
  })
})

describe("resolvePickerFamily", () => {
  it("resolves tabs family", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tabs",
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
      command: "tabs",
      subcommand: "-list",
      records: [
        { kind: "tabs.tab", fields: {} },
        { kind: "search.hit", fields: {} }
      ]
    }
    assert.deepEqual(resolvePickerFamily(listResult), { ok: false, reason: "mixed" })
  })

  it("uses command name when records are empty", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "setting",
      subcommand: "-list",
      records: []
    }
    assert.deepEqual(resolvePickerFamily(listResult), { ok: true, family: "setting" })
  })
})
