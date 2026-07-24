import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { formatListPipeLines, formatRecordPipeLine } from "./format-pipe.ts"
import { formatListPlainLines } from "./format-plain-lines.ts"
import type { ListRecord, ListResult } from "./types.ts"
import { LIST_OUTPUT_SCHEMA } from "./types.ts"

const sampleRecord: ListRecord = {
  kind: "tabs.tab",
  fields: { tabId: 1, title: "Example" },
  display: { label: 'T id=1 "Example"' }
}

const sampleResult: ListResult = {
  schema: LIST_OUTPUT_SCHEMA,
  command: "tab",
  subcommand: "-list",
  records: [sampleRecord]
}

describe("formatRecordPipeLine", () => {
  it("builds TSV from fields when pipeLine is omitted", () => {
    assert.equal(formatRecordPipeLine(sampleRecord), "tabs.tab\ttabId=1\ttitle=Example")
  })

  it("uses explicit pipeLine when set", () => {
    assert.equal(
      formatRecordPipeLine({ ...sampleRecord, pipeLine: "custom" }),
      "custom"
    )
  })
})

describe("formatListPlainLines", () => {
  it("renders display labels", () => {
    assert.deepEqual(formatListPlainLines(sampleResult), ['T id=1 "Example"'])
  })
})

describe("formatListPipeLines", () => {
  it("maps all records", () => {
    assert.deepEqual(formatListPipeLines([sampleRecord]), ["tabs.tab\ttabId=1\ttitle=Example"])
  })
})
