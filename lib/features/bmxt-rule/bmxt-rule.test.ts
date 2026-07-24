import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  BMXT_RULE_SCHEMA,
  bmxtRuleRecord,
  bmxtRuleStreamFromListResult,
  getBmxtRuleEntry,
  getBmxtRuleProducerEntry,
  parseBmxtRuleStreamJson,
  serializeBmxtRuleStreamJson,
  validateBmxtRuleStream
} from "./index.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../command-line/list-output/types.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(__dirname, "fixtures", "tabs-list.sample.json")

describe("bmxtRule entries", () => {
  it("reads entry values by key from extensible arrays", () => {
    const record = bmxtRuleRecord("page.open", {
      url: "https://example.com",
      pageTitle: "Example",
      tabId: 42,
      favicon: "data:image/png;base64,abc"
    })
    assert.equal(getBmxtRuleEntry(record, "tabId"), 42)
    assert.equal(getBmxtRuleEntry(record, "favicon"), "data:image/png;base64,abc")
    assert.equal(getBmxtRuleEntry(record, "missing"), undefined)
  })
})

describe("bmxtRule stream validation", () => {
  it("accepts fixture envelope", () => {
    const raw = readFileSync(fixturePath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    assert.equal(validateBmxtRuleStream(parsed), true)
  })

  it("round-trips stream JSON", () => {
    const raw = readFileSync(fixturePath, "utf8")
    const stream = parseBmxtRuleStreamJson(raw)
    const again = parseBmxtRuleStreamJson(serializeBmxtRuleStreamJson(stream))
    assert.deepEqual(again, stream)
  })
})

describe("bmxtRule adapter from ListResult", () => {
  it("maps tabs.tab to page.open with entry arrays", () => {
    const listResult: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: [
        {
          kind: "tabs.tab",
          fields: {
            tabId: 7,
            windowId: 1,
            groupId: null,
            title: "Example",
            url: "https://example.com",
            active: true
          }
        }
      ]
    }
    const stream = bmxtRuleStreamFromListResult(listResult)
    assert.equal(stream.schema, BMXT_RULE_SCHEMA)
    assert.equal(getBmxtRuleProducerEntry(stream.producer, "command"), "tab")
    assert.equal(stream.records.length, 1)
    assert.equal(stream.records[0]!.kind, "page.open")
    assert.equal(getBmxtRuleEntry(stream.records[0]!, "tabId"), 7)
    assert.equal(getBmxtRuleEntry(stream.records[0]!, "pageTitle"), "Example")
  })
})
