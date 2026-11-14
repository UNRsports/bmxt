import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { JobRunner, shouldCancelJob } from "../../../../shared/lib/features/job/index.ts"

describe("JobRunner.cancelHandle wind-down", () => {
  it("keeps getActive() readable as cancelled until start() finishes", async () => {
    const runner = new JobRunner("test-cancel-wind-down")
    let sawCancelDuringWork = false

    const started = runner.start("search-list", async (job) => {
      runner.cancelHandle(job)
      assert.equal(shouldCancelJob(job), true)
      assert.equal(shouldCancelJob(runner.getActive("search-list")), true)
      sawCancelDuringWork = true
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5)
      })
      return "done"
    })

    const result = await started
    assert.equal(sawCancelDuringWork, true)
    assert.equal(result, undefined)
    assert.equal(runner.getActive("search-list"), null)
  })
})
