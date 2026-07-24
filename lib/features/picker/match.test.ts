import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { isPickerPrefixCommand, parsePickerPrefixLine } from "./match.ts"
import { resolvePickerFamily } from "./resolve-family.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../command-line/list-output/types.ts"

describe("browse prefix match", () => {
  it("parses bare browse as usage", () => {
    assert.deepEqual(parsePickerPrefixLine("browse"), { kind: "usage" })
    assert.equal(isPickerPrefixCommand("browse"), true)
  })

  it("parses browse with list producer", () => {
    assert.deepEqual(parsePickerPrefixLine("browse tab -list"), {
      kind: "run",
      producerSegment: "tab -list"
    })
    assert.deepEqual(parsePickerPrefixLine("browse tab -list -url"), {
      kind: "run",
      producerSegment: "tab -list -url"
    })
    assert.deepEqual(parsePickerPrefixLine("browse search -list foo"), {
      kind: "run",
      producerSegment: "search -list foo"
    })
  })

  it("rejects non-browse segments", () => {
    assert.equal(parsePickerPrefixLine("tab -list"), null)
    assert.equal(isPickerPrefixCommand("tab -list | browse"), false)
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
