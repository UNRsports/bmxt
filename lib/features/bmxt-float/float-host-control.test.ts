/**
 * EN: Unit tests for float show + inject fallback sequence.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { showFloatOnTabWithInject } from "./float-show-sequence.ts"

describe("showFloatOnTabWithInject", () => {
  it("returns true when sendShow succeeds immediately", async () => {
    const events: string[] = []
    const ok = await showFloatOnTabWithInject(1, {
      sendShow: async () => {
        events.push("show")
        return true
      },
      inject: async () => {
        events.push("inject")
        return true
      },
      markDesired: async () => {
        events.push("desired")
      },
      wait: async () => {
        events.push("wait")
      }
    })
    assert.equal(ok, true)
    assert.deepEqual(events, ["show", "desired"])
  })

  it("injects then shows when the first sendShow fails", async () => {
    let shows = 0
    const events: string[] = []
    const ok = await showFloatOnTabWithInject(2, {
      sendShow: async () => {
        shows += 1
        events.push(`show:${shows}`)
        return shows >= 2
      },
      inject: async () => {
        events.push("inject")
        return true
      },
      markDesired: async () => {
        events.push("desired")
      },
      wait: async (ms) => {
        events.push(`wait:${ms}`)
      }
    })
    assert.equal(ok, true)
    assert.deepEqual(events, ["show:1", "inject", "wait:120", "show:2", "desired"])
  })

  it("returns false when inject and retries cannot show", async () => {
    const ok = await showFloatOnTabWithInject(3, {
      sendShow: async () => null,
      inject: async () => false,
      markDesired: async () => undefined,
      wait: async () => undefined
    })
    assert.equal(ok, false)
  })
})
