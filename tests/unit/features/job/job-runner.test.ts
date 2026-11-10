import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { JobRunner } from "../../../../shared/lib/features/job/job-runner.ts"

/** EN: Controllable promise — avoids fixed sleeps that race under CI load. */
function deferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe("JobRunner", () => {
  it("supersedes an in-flight search-list job", async () => {
    const runner = new JobRunner("session-a")
    const firstEntered = deferred()
    const releaseFirst = deferred()
    let firstDone = false

    const first = runner.start(
      "search-list",
      async (job) => {
        firstEntered.resolve()
        await releaseFirst.promise
        if (!job.cancelled) {
          firstDone = true
        }
      },
      { persist: false }
    )
    await firstEntered.promise
    await runner.start(
      "search-list",
      async () => {},
      { persist: false }
    )
    releaseFirst.resolve()
    await first

    assert.equal(firstDone, false)
    assert.equal(runner.isActive("search-list"), false)
  })

  it("coalesces tab-picker refresh to the latest generation", async () => {
    const runner = new JobRunner("__terminal__")
    const applied: number[] = []
    let latestGeneration = 0
    const firstEntered = deferred()
    const releaseFirst = deferred()

    const first = runner.startCoalesced(
      "tab-picker-refresh",
      async (job, generation) => {
        latestGeneration = generation
        firstEntered.resolve()
        await releaseFirst.promise
        if (!job.cancelled && generation === latestGeneration) {
          applied.push(generation)
        }
        return generation
      },
      { persist: false }
    )
    await firstEntered.promise
    const second = runner.startCoalesced(
      "tab-picker-refresh",
      async (job, generation) => {
        latestGeneration = generation
        if (!job.cancelled && generation === latestGeneration) {
          applied.push(generation)
        }
        return generation
      },
      { persist: false }
    )
    releaseFirst.resolve()

    await Promise.all([first, second])
    assert.deepEqual(applied, [2])
  })

  it("allows parallel run-cmd jobs", async () => {
    const runner = new JobRunner("__background__")
    let concurrent = 0
    let maxConcurrent = 0
    let entered = 0
    const bothEntered = deferred()
    const release = deferred()

    const run = async (): Promise<void> => {
      concurrent += 1
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      entered += 1
      if (entered === 2) {
        bothEntered.resolve()
      }
      await release.promise
      concurrent -= 1
    }

    const pending = Promise.all([
      runner.start("run-cmd", run, { persist: false }),
      runner.start("run-cmd", run, { persist: false })
    ])
    await bothEntered.promise
    release.resolve()
    await pending

    assert.equal(maxConcurrent, 2)
  })
})
