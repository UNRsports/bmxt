import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { ensureBmxtCoreForTests } from "../../../../shared/lib/features/bmxt-core/test-ensure-wasm.ts"
import {
  bmxtRuleStreamFromResolvedTabs,
  bmxtRuleStreamFromTabIds,
  type ResolvedChipTab
} from "../../../../shared/lib/features/bmxt-rule/adapters/from-tab-ids.ts"
import {
  evaluateTabChipSendContract,
  pageOpenRecordsMissingUrl
} from "../../../../shared/lib/features/command-line/pipe/consumers/tab-chip-send-contract.ts"
import { urlBatchesFromBmxtRuleStream } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-batches.ts"

ensureBmxtCoreForTests()

const sampleTabs: ResolvedChipTab[] = [
  {
    tabId: 11,
    url: "https://a.example/",
    pageTitle: "A",
    groupId: -1,
    groupTitle: null,
    groupColor: null
  },
  {
    tabId: 22,
    url: "https://b.example/",
    pageTitle: "B",
    groupId: -1,
    groupTitle: null,
    groupColor: null
  }
]

describe("tab-chip | tab -send contract", () => {
  it("picker Family send path yields sendable URLs from resolved chips", () => {
    const result = evaluateTabChipSendContract({
      chipSegment: "#t:11 #t:22",
      sendSegment: "tab -send peerDeviceAbc --close",
      resolvedTabs: sampleTabs
    })
    assert.ok(result)
    assert.deepEqual(result!.chipIds, [11, 22])
    assert.equal(result!.deviceId, "peerDeviceAbc")
    assert.equal(result!.closeAfter, true)
    assert.equal(result!.sendableUrlCount, 2)
    assert.equal(pageOpenRecordsMissingUrl(result!.stream), 0)
    assert.deepEqual(result!.batches[0]?.urls, ["https://a.example/", "https://b.example/"])
  })

  it("rejects the historical empty-url page.open leak for tab-send", () => {
    // EN: Pre-fix producer shape — page.open with url:"" must not count as sendable.
    // JA: 修正前の生産形。url:"" の page.open は送信可能と数えない。
    const leaked = bmxtRuleStreamFromResolvedTabs([
      {
        tabId: 1,
        url: "",
        pageTitle: "",
        groupId: -1,
        groupTitle: null,
        groupColor: null
      },
      {
        tabId: 2,
        url: "   ",
        pageTitle: "",
        groupId: -1,
        groupTitle: null,
        groupColor: null
      }
    ])
    assert.equal(leaked.records.length, 0)
    assert.equal(urlBatchesFromBmxtRuleStream(leaked).length, 0)
    assert.equal(pageOpenRecordsMissingUrl(leaked), 0)
  })

  it("drops empty-url tabs when mixed with valid chips", () => {
    const result = evaluateTabChipSendContract({
      chipSegment: "#t:1 #t:2 #t:3",
      sendSegment: "tab -send peer1",
      resolvedTabs: [
        {
          tabId: 1,
          url: "",
          pageTitle: "",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        },
        {
          tabId: 2,
          url: "https://ok.example/",
          pageTitle: "OK",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        },
        {
          tabId: 3,
          url: "https://also.example/",
          pageTitle: "Also",
          groupId: -1,
          groupTitle: null,
          groupColor: null
        }
      ]
    })
    assert.ok(result)
    assert.equal(result!.sendableUrlCount, 2)
    assert.equal(pageOpenRecordsMissingUrl(result!.stream), 0)
  })
})

describe("bmxtRuleStreamFromTabIds (chrome.tabs.get)", () => {
  const previousChrome = (globalThis as { chrome?: unknown }).chrome

  afterEach(() => {
    if (previousChrome === undefined) {
      delete (globalThis as { chrome?: unknown }).chrome
    } else {
      ;(globalThis as { chrome?: unknown }).chrome = previousChrome
    }
  })

  it("resolves live tab urls before tab-send can consume the stream", async () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      tabs: {
        get: async (tabId: number) => {
          if (tabId === 7) {
            return {
              id: 7,
              url: "https://live.example/seven",
              title: "Seven",
              groupId: -1
            }
          }
          if (tabId === 8) {
            return {
              id: 8,
              url: "",
              pendingUrl: "https://live.example/eight",
              title: "Eight",
              groupId: -1
            }
          }
          throw new Error(`missing tab ${tabId}`)
        }
      },
      tabGroups: {
        get: async () => {
          throw new Error("unused")
        }
      }
    }

    const stream = await bmxtRuleStreamFromTabIds([7, 8, 9])
    assert.equal(pageOpenRecordsMissingUrl(stream), 0)
    const batches = urlBatchesFromBmxtRuleStream(stream)
    assert.equal(batches.length, 1)
    assert.deepEqual(batches[0]?.urls, [
      "https://live.example/seven",
      "https://live.example/eight"
    ])
    assert.deepEqual(batches[0]?.tabIds, [7, 8])
  })

  it("keeps empty-URL tabs for move/close when requireUrl is false", async () => {
    ;(globalThis as { chrome: unknown }).chrome = {
      tabs: {
        get: async (tabId: number) => {
          if (tabId === 1) {
            return { id: 1, url: "https://a.example/", title: "A", groupId: -1 }
          }
          if (tabId === 2) {
            return { id: 2, url: "", title: "Blank", groupId: -1 }
          }
          if (tabId === 3) {
            return { id: 3, url: "chrome://extensions/", title: "Ext", groupId: -1 }
          }
          throw new Error(`missing tab ${tabId}`)
        }
      },
      tabGroups: {
        get: async () => {
          throw new Error("unused")
        }
      }
    }

    const stream = await bmxtRuleStreamFromTabIds([1, 2, 3], { requireUrl: false })
    const opens = stream.records.filter((r) => r.kind === "page.open")
    assert.equal(opens.length, 3)
    const { tabIdsFromBmxtRuleStream } = await import(
      "../../../../shared/lib/features/command-line/pipe/consumers/stream-accepts-kinds.ts"
    )
    assert.deepEqual(tabIdsFromBmxtRuleStream(stream), [1, 2, 3])
  })
})
