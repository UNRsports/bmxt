import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isPickerPrefixCommand, parsePickerPrefixLine } from "./match.ts"
import { resolvePickerFamily } from "./resolve-family.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../command-line/list-output/types.ts"

describe("picker prefix match", () => {
  it("parses bare picker as usage", () => {
    assert.deepEqual(parsePickerPrefixLine("picker"), { kind: "usage" })
    assert.equal(isPickerPrefixCommand("picker"), true)
  })

  it("parses picker with list producer", () => {
    assert.deepEqual(parsePickerPrefixLine("picker tabs -list"), {
      kind: "run",
      producerSegment: "tabs -list"
    })
    assert.deepEqual(parsePickerPrefixLine("picker tabs -list -u"), {
      kind: "run",
      producerSegment: "tabs -list -u"
    })
    assert.deepEqual(parsePickerPrefixLine("picker search -list foo"), {
      kind: "run",
      producerSegment: "search -list foo"
    })
  })

  it("rejects non-picker segments", () => {
    assert.equal(parsePickerPrefixLine("tabs -list"), null)
    assert.equal(isPickerPrefixCommand("tabs -list | picker"), false)
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
})
