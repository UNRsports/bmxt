import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BMXT_RULE_SCHEMA } from "../../../../shared/lib/features/bmxt-rule/types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../../../../shared/lib/features/bmxt-rule/entries.ts"
import { urlBatchesFromBmxtRuleStream } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-batches.ts"
import { parseSyncOpenPipeConsumer } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-match.ts"

describe("parseSyncOpenPipeConsumer", () => {
  it("accepts sync -open <deviceId>", () => {
    assert.deepEqual(parseSyncOpenPipeConsumer("sync -open peer1"), { deviceId: "peer1" })
  })

  it("rejects urls on the right-hand side", () => {
    assert.equal(parseSyncOpenPipeConsumer("sync -open peer1 https://example.com"), null)
    assert.equal(parseSyncOpenPipeConsumer("sync -open"), null)
  })
})

describe("urlBatchesFromBmxtRuleStream", () => {
  it("groups urls by preceding page.group label", () => {
    const stream = {
      schema: BMXT_RULE_SCHEMA,
      producer: bmxtRuleProducer({ command: "tab", subcommand: "-list" }),
      records: [
        bmxtRuleRecord("page.group", { label: "Work", pageTitle: "Work", url: "" }),
        bmxtRuleRecord("page.open", { url: "https://a.example/", pageTitle: "A", tabId: 1 }),
        bmxtRuleRecord("page.open", { url: "https://b.example/", pageTitle: "B", tabId: 2 }),
        bmxtRuleRecord("page.group", { label: "Play", pageTitle: "Play", url: "" }),
        bmxtRuleRecord("page.open", { url: "https://c.example/", pageTitle: "C", tabId: 3 })
      ]
    }
    const batches = urlBatchesFromBmxtRuleStream(stream)
    assert.equal(batches.length, 2)
    assert.deepEqual(batches[0], {
      groupTitle: "Work",
      urls: ["https://a.example/", "https://b.example/"]
    })
    assert.deepEqual(batches[1], {
      groupTitle: "Play",
      urls: ["https://c.example/"]
    })
  })
})
