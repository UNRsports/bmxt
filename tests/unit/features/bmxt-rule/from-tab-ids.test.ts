import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bmxtRuleStreamFromResolvedTabs,
  type ResolvedChipTab
} from "../../../../shared/lib/features/bmxt-rule/adapters/from-tab-ids.ts"
import { urlBatchesFromBmxtRuleStream } from "../../../../shared/lib/features/command-line/pipe/consumers/sync-open-batches.ts"

describe("bmxtRuleStreamFromResolvedTabs", () => {
  it("emits page.open records with resolved urls for ungrouped tabs", () => {
    const tabs: ResolvedChipTab[] = [
      {
        tabId: 1,
        url: "https://a.example/",
        pageTitle: "A",
        groupId: -1,
        groupTitle: null,
        groupColor: null
      },
      {
        tabId: 2,
        url: "https://b.example/",
        pageTitle: "B",
        groupId: -1,
        groupTitle: null,
        groupColor: null
      }
    ]
    const stream = bmxtRuleStreamFromResolvedTabs(tabs)
    const batches = urlBatchesFromBmxtRuleStream(stream)
    assert.deepEqual(batches, [
      {
        groupTitle: null,
        groupColor: null,
        urls: ["https://a.example/", "https://b.example/"],
        tabIds: [1, 2]
      }
    ])
  })

  it("preserves group batches and clears group for following ungrouped tabs", () => {
    const tabs: ResolvedChipTab[] = [
      {
        tabId: 1,
        url: "https://a.example/",
        pageTitle: "A",
        groupId: 10,
        groupTitle: "Work",
        groupColor: "blue"
      },
      {
        tabId: 2,
        url: "https://b.example/",
        pageTitle: "B",
        groupId: 10,
        groupTitle: "Work",
        groupColor: "blue"
      },
      {
        tabId: 3,
        url: "https://c.example/",
        pageTitle: "C",
        groupId: -1,
        groupTitle: null,
        groupColor: null
      }
    ]
    const stream = bmxtRuleStreamFromResolvedTabs(tabs)
    const batches = urlBatchesFromBmxtRuleStream(stream)
    assert.deepEqual(batches, [
      {
        groupTitle: "Work",
        groupColor: "blue",
        urls: ["https://a.example/", "https://b.example/"],
        tabIds: [1, 2]
      },
      {
        groupTitle: null,
        groupColor: null,
        urls: ["https://c.example/"],
        tabIds: [3]
      }
    ])
  })
})
