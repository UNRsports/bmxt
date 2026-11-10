import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BMXT_RULE_SCHEMA } from "../../../../shared/lib/features/bmxt-rule/types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../../../../shared/lib/features/bmxt-rule/entries.ts"
import { urlBatchesFromBmxtRuleStream } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-batches.ts"
import { parseTabSendPipeConsumer } from "../../../../shared/lib/features/command-line/pipe/consumers/tab-send-match.ts"
import { tabIdsForOpenedUrls } from "../../../../shared/lib/features/sync/bus/close-local-after-open.ts"
import { parseOpenPayload } from "../../../../shared/lib/features/sync/bus/parse-open-payload.ts"
import { parsePickerCommand } from "../../../../shared/lib/features/tabs/parse-picker-command.ts"
import { resolveFamilySendDestination } from "../../../../shared/lib/features/tabs/resolve-family-send-dest.ts"
import type { TabPickerRow } from "../../../../shared/lib/features/tabs/picker-rows.ts"

describe("parseTabSendPipeConsumer", () => {
  it("accepts tab -send <deviceId>", () => {
    assert.deepEqual(parseTabSendPipeConsumer("tab -send peer1"), {
      deviceId: "peer1",
      closeAfter: false
    })
  })

  it("accepts tab -send <deviceId> --close", () => {
    assert.deepEqual(parseTabSendPipeConsumer("tab -send peer1 --close"), {
      deviceId: "peer1",
      closeAfter: true
    })
  })

  it("rejects legacy sync -open pipe form", () => {
    assert.equal(parseTabSendPipeConsumer("sync -open peer1"), null)
  })

  it("rejects urls on the right-hand side", () => {
    assert.equal(parseTabSendPipeConsumer("tab -send peer1 https://example.com"), null)
    assert.equal(parseTabSendPipeConsumer("tab -send"), null)
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

describe("parsePickerCommand", () => {
  it("accepts move and move --close only", () => {
    assert.deepEqual(parsePickerCommand("move"), {
      kind: "bulk",
      mode: "move",
      closeAfter: false
    })
    assert.deepEqual(parsePickerCommand("move --close"), {
      kind: "bulk",
      mode: "move",
      closeAfter: true
    })
  })

  it("rejects short alias m", () => {
    assert.equal(parsePickerCommand("m").kind, "unknown")
    assert.equal(parsePickerCommand("m --close").kind, "unknown")
  })
})

describe("resolveFamilySendDestination", () => {
  it("resolves remote window destination", () => {
    const rows: TabPickerRow[] = [
      {
        kind: "window",
        windowId: -1,
        label: "Firefox",
        windowTitle: "Firefox",
        usesActiveTabTitle: false,
        focused: false,
        deviceId: "peer-ff",
        remote: true,
        peerWindowId: 42
      }
    ]
    assert.deepEqual(resolveFamilySendDestination(rows, [0], 0), {
      deviceId: "peer-ff",
      peerWindowId: 42
    })
  })

  it("ignores local window destination", () => {
    const rows: TabPickerRow[] = [
      {
        kind: "window",
        windowId: 1,
        label: "Chrome",
        windowTitle: "Chrome",
        usesActiveTabTitle: false,
        focused: true,
        deviceId: null,
        remote: false,
        peerWindowId: null
      }
    ]
    assert.equal(resolveFamilySendDestination(rows, [0], 0), null)
  })
})
