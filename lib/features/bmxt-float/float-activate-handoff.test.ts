/**
 * EN: Unit tests for float activate-tab handoff core.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  handoffFloatAcrossTabActivate,
  isBmxtFloatActivateHandoffMessage
} from "./float-activate-handoff.ts"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"
import type { FloatTabHandoffPayload } from "./float-tab-handoff.ts"

function samplePayload(): FloatTabHandoffPayload {
  return {
    sessions: {
      v: 2,
      order: ["s1"],
      activeId: "s1",
      logsById: { s1: ["> hi"] },
      namesById: {}
    },
    browse: createEmptyFloatBrowseState(),
    pickersBySession: {
      s1: {
        tabs: {
          rows: [],
          showUrl: false,
          initialHi: 0
        },
        search: null,
        dom: null,
        setting: null
      }
    }
  }
}

describe("float-activate-handoff", () => {
  it("isBmxtFloatActivateHandoffMessage accepts a valid request", () => {
    assert.equal(
      isBmxtFloatActivateHandoffMessage({
        type: "BMXT_FLOAT_ACTIVATE_HANDOFF",
        fromTabId: 1,
        toTabId: 2
      }),
      true
    )
  })

  it("isBmxtFloatActivateHandoffMessage rejects malformed requests", () => {
    assert.equal(isBmxtFloatActivateHandoffMessage(null), false)
    assert.equal(
      isBmxtFloatActivateHandoffMessage({
        type: "BMXT_FLOAT_ACTIVATE_HANDOFF",
        fromTabId: 1.5,
        toTabId: 2
      }),
      false
    )
  })

  it("handoffFloatAcrossTabActivate returns same when tabs match", async () => {
    const result = await handoffFloatAcrossTabActivate(3, 3, {
      hydrateVisible: async () => undefined,
      isDesiredVisible: () => true,
      take: async () => samplePayload(),
      getTabUrl: async () => "https://example.com",
      place: async () => "shown",
      hideSource: async () => undefined
    })
    assert.equal(result, "same")
  })

  it("handoffFloatAcrossTabActivate noops when float is not desired on source", async () => {
    let placed = false
    const result = await handoffFloatAcrossTabActivate(1, 2, {
      hydrateVisible: async () => undefined,
      isDesiredVisible: () => false,
      take: async () => samplePayload(),
      getTabUrl: async () => "https://example.com",
      place: async () => {
        placed = true
        return "shown"
      },
      hideSource: async () => undefined
    })
    assert.equal(result, "noop")
    assert.equal(placed, false)
  })

  it("handoffFloatAcrossTabActivate places, then hides source", async () => {
    const events: string[] = []
    const payload = samplePayload()
    const result = await handoffFloatAcrossTabActivate(10, 20, {
      hydrateVisible: async () => {
        events.push("hydrate")
      },
      isDesiredVisible: (id) => id === 10,
      livePickers: payload.pickersBySession,
      writePickers: async (tabId, pickers) => {
        events.push(`writePickers:${tabId}:${Object.keys(pickers).join(",")}`)
      },
      take: async (tabId) => {
        events.push(`take:${tabId}`)
        return payload
      },
      getTabUrl: async (tabId) => {
        events.push(`url:${tabId}`)
        return "https://dest.example"
      },
      place: async (_p, dest, url) => {
        events.push(`place:${dest}:${url ?? ""}`)
        return "shown"
      },
      hideSource: async (tabId) => {
        events.push(`hide:${tabId}`)
      }
    })
    assert.equal(result, "shown")
    assert.deepEqual(events, [
      "hydrate",
      "writePickers:10:s1",
      "take:10",
      "url:20",
      "place:20:https://dest.example",
      "hide:10"
    ])
  })

  it("handoffFloatAcrossTabActivate returns pending when place parks the payload", async () => {
    const result = await handoffFloatAcrossTabActivate(1, 2, {
      hydrateVisible: async () => undefined,
      isDesiredVisible: () => true,
      take: async () => samplePayload(),
      getTabUrl: async () => "chrome://settings",
      place: async () => "pending",
      hideSource: async () => undefined
    })
    assert.equal(result, "pending")
  })
})
