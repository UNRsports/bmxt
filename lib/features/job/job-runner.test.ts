import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { JobRunner } from "./job-runner.ts"

describe("JobRunner", () => {
  it("supersedes an in-flight search-list job", async () => {
    const runner = new JobRunner("session-a")
    let firstDone = false

    const first = runner.start(
      "search-list",
      async (job) => {
        await new Promise((r) => setTimeout(r, 50))
        if (!job.cancelled) {
          firstDone = true
        }
      },
      { persist: false }
    )
    await new Promise((r) => setTimeout(r, 5))
    await runner.start(
      "search-list",
      async () => {},
      { persist: false }
    )
    await first

    assert.equal(firstDone, false)
    assert.equal(runner.isActive("search-list"), false)
  })

  it("coalesces tab-picker refresh to the latest generation", async () => {
    const runner = new JobRunner("__terminal__")
    const applied: number[] = []
    let latestGeneration = 0

    const first = runner.startCoalesced(
      "tab-picker-refresh",
      async (job, generation) => {
        latestGeneration = generation
        await new Promise((r) => setTimeout(r, 40))
        if (!job.cancelled && generation === latestGeneration) {
          applied.push(generation)
        }
        return generation
      },
      { persist: false }
    )
    await new Promise((r) => setTimeout(r, 5))
    const second = runner.startCoalesced(
      "tab-picker-refresh",
      async (job, generation) => {
        latestGeneration = generation
        await new Promise((r) => setTimeout(r, 5))
        if (!job.cancelled && generation === latestGeneration) {
          applied.push(generation)
        }
        return generation
      },
      { persist: false }
    )

    await Promise.all([first, second])
    assert.deepEqual(applied, [2])
  })

  it("allows parallel run-cmd jobs", async () => {
    const runner = new JobRunner("__background__")
    let concurrent = 0
    let maxConcurrent = 0

    await Promise.all([
      runner.start(
        "run-cmd",
        async () => {
          concurrent += 1
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise((r) => setTimeout(r, 20))
          concurrent -= 1
        },
        { persist: false }
      ),
      runner.start(
        "run-cmd",
        async () => {
          concurrent += 1
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise((r) => setTimeout(r, 20))
          concurrent -= 1
        },
        { persist: false }
      )
    ])

    assert.equal(maxConcurrent, 2)
  })
})
