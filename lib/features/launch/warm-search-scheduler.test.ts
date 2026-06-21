import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"

import {
  IDLE_WARM_FALLBACK_MS,
  POST_LAUNCH_WARM_DELAY_MS,
  notifyInteractiveLaunchCompleted,
  readWarmSearchSchedulerStateForTests,
  resetWarmSearchSchedulerForTests,
  scheduleDeferredWarmSearchCaches,
  setWarmSearchRunForTests
} from "./warm-search-scheduler.ts"

describe("warm search scheduler", () => {
  let warmCalls = 0

  afterEach(() => {
    resetWarmSearchSchedulerForTests()
    warmCalls = 0
  })

  function installWarmMock() {
    setWarmSearchRunForTests(async () => {
      warmCalls += 1
    })
  }

  it("does not warm immediately on scheduleDeferredWarmSearchCaches", () => {
    installWarmMock()
    scheduleDeferredWarmSearchCaches({ idleFallbackMs: IDLE_WARM_FALLBACK_MS })
    assert.equal(warmCalls, 0)
    assert.equal(readWarmSearchSchedulerStateForTests().warmState, "scheduled")
  })

  it("warms after idle fallback", async () => {
    installWarmMock()
    scheduleDeferredWarmSearchCaches({ idleFallbackMs: 20 })
    await new Promise((resolve) => setTimeout(resolve, 35))
    assert.equal(warmCalls, 1)
    assert.equal(readWarmSearchSchedulerStateForTests().warmState, "done")
    assert.equal(readWarmSearchSchedulerStateForTests().lastStartReason, "idle-timeout")
  })

  it("defers warm until after launch notification", async () => {
    installWarmMock()
    scheduleDeferredWarmSearchCaches({ idleFallbackMs: 500 })
    notifyInteractiveLaunchCompleted({ postLaunchDelayMs: POST_LAUNCH_WARM_DELAY_MS })
    await new Promise((resolve) => setTimeout(resolve, POST_LAUNCH_WARM_DELAY_MS - 20))
    assert.equal(warmCalls, 0)
    await new Promise((resolve) => setTimeout(resolve, 40))
    assert.equal(warmCalls, 1)
    assert.equal(readWarmSearchSchedulerStateForTests().lastStartReason, "after-launch")
  })

  it("cancels idle timer when launch completes first", async () => {
    installWarmMock()
    scheduleDeferredWarmSearchCaches({ idleFallbackMs: 500 })
    notifyInteractiveLaunchCompleted({ postLaunchDelayMs: 10 })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.equal(warmCalls, 1)
    await new Promise((resolve) => setTimeout(resolve, 500))
    assert.equal(warmCalls, 1)
  })
})
