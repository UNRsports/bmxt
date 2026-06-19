import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  cancelJobHandle,
  createJobHandle,
  isJobHandleActive,
  shouldCancelJob
} from "../job/job-handle.ts"

describe("search-list-job compatibility", () => {
  it("cancels the previous job when a new one starts", () => {
    const first = createJobHandle("search-list", 1, "", null)
    const second = createJobHandle("search-list", 2, "", first)
    assert.equal(first.cancelled, true)
    assert.equal(second.cancelled, false)
    assert.equal(isJobHandleActive(first), false)
    assert.equal(isJobHandleActive(second), true)
  })

  it("marks a job inactive after explicit cancel", () => {
    const job = createJobHandle("search-list", 1, "", null)
    cancelJobHandle(job)
    assert.equal(isJobHandleActive(job), false)
    assert.equal(shouldCancelJob(job), true)
  })
})
