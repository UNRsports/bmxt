import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { runPageScanPool } from "../../../../shared/lib/features/search/sources/page-scan-pool.ts"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe("runPageScanPool", () => {
  it("runs all indices and respects concurrency bound", async () => {
    let inFlight = 0
    let maxInFlight = 0
    const seen: number[] = []
    const { cancelled, claimed } = await runPageScanPool(10, 3, async (index) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      seen.push(index)
      await sleep(15)
      inFlight -= 1
    })
    assert.equal(cancelled, false)
    assert.equal(claimed, 10)
    assert.deepEqual(seen.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    assert.ok(maxInFlight <= 3)
    assert.ok(maxInFlight >= 2)
  })

  it("stops claiming new work when shouldCancel flips", async () => {
    let cancel = false
    let started = 0
    const { cancelled, claimed } = await runPageScanPool(
      20,
      2,
      async () => {
        started += 1
        if (started >= 2) {
          cancel = true
        }
        await sleep(20)
      },
      () => cancel
    )
    assert.equal(cancelled, true)
    assert.ok(claimed < 20)
    assert.ok(claimed >= 2)
  })

  it("handles empty input", async () => {
    const result = await runPageScanPool(0, 4, async () => {
      assert.fail("worker should not run")
    })
    assert.deepEqual(result, { cancelled: false, claimed: 0 })
  })
})
