import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BMXT_RULE_SCHEMA } from "../../../../shared/lib/features/bmxt-rule/types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../../../../shared/lib/features/bmxt-rule/entries.ts"
import { urlBatchesFromBmxtRuleStream } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-batches.ts"
import { parseSyncOpenPipeConsumer } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-match.ts"
import { tabIdsForOpenedUrls } from "../../../../shared/lib/features/sync/bus/close-local-after-open.ts"
import { parseOpenPayload } from "../../../../shared/lib/features/sync/bus/parse-open-payload.ts"

describe("parseSyncOpenPipeConsumer", () => {
  it("accepts sync -open <deviceId>", () => {
    assert.deepEqual(parseSyncOpenPipeConsumer("sync -open peer1"), {
      deviceId: "peer1",
      closeAfter: false
    })
  })

  it("accepts sync -open <deviceId> --close", () => {
    assert.deepEqual(parseSyncOpenPipeConsumer("sync -open peer1 --close"), {
      deviceId: "peer1",
      closeAfter: true
    })
  })

  it("rejects urls on the right-hand side", () => {
    assert.equal(parseSyncOpenPipeConsumer("sync -open peer1 https://example.com"), null)
    assert.equal(parseSyncOpenPipeConsumer("sync -open"), null)
  })
})

describe("parseOpenPayload", () => {
  it("parses --group and --close", () => {
    assert.deepEqual(
      parseOpenPayload("https://a.example/ --group Work --close https://b.example/"),
      {
        urls: ["https://a.example/", "https://b.example/"],
        groupTitle: "Work",
        closeAfter: true
      }
    )
  })
})

describe("tabIdsForOpenedUrls", () => {
  it("closes only successfully opened local tabs", () => {
    const ids = tabIdsForOpenedUrls(
      [
        { url: "https://a.example/", tabId: 1 },
        { url: "https://b.example/", tabId: 2 },
        { url: "https://c.example/", tabId: 3 }
      ],
      ["https://a.example/", "https://c.example/"]
    )
    assert.deepEqual(ids, [1, 3])
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
      urls: ["https://a.example/", "https://b.example/"],
      tabIds: [1, 2]
    })
    assert.deepEqual(batches[1], {
      groupTitle: "Play",
      urls: ["https://c.example/"],
      tabIds: [3]
    })
  })
})
