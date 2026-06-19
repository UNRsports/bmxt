import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  cancelJobHandle,
  createJobHandle,
  isJobHandleActive,
  shouldCancelJob
} from "./job-handle.ts"

describe("job-handle", () => {
  it("cancels the previous handle when a new one starts", () => {
    const first = createJobHandle("search-list", 1, "s1", null)
    const second = createJobHandle("search-list", 2, "s1", first)
    assert.equal(first.cancelled, true)
    assert.equal(second.cancelled, false)
    assert.equal(isJobHandleActive(first), false)
    assert.equal(isJobHandleActive(second), true)
  })

  it("marks a handle inactive after explicit cancel", () => {
    const job = createJobHandle("dom-list", 1, "s1", null)
    cancelJobHandle(job)
    assert.equal(isJobHandleActive(job), false)
    assert.equal(shouldCancelJob(job), true)
  })
})
