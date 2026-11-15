import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createLocalInventoryAnnounceScheduler } from "../../../../shared/lib/features/sync/bus/local-inventory-announce-schedule.ts"

describe("createLocalInventoryAnnounceScheduler", () => {
  it("coalesces rapid schedules into one flush", async () => {
    let flushes = 0
    const { schedule, cancel } = createLocalInventoryAnnounceScheduler({
      debounceMs: 20,
      flush: () => {
        flushes += 1
      }
    })
    schedule()
    schedule()
    schedule()
    assert.equal(flushes, 0)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
    assert.equal(flushes, 1)
    cancel()
  })

  it("cancel prevents a pending flush", async () => {
    let flushes = 0
    const { schedule, cancel } = createLocalInventoryAnnounceScheduler({
      debounceMs: 30,
      flush: () => {
        flushes += 1
      }
    })
    schedule()
    cancel()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
    assert.equal(flushes, 0)
  })
})
