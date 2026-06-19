import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cancelSearchListJob,
  createSearchListJob,
  isSearchListJobActive
} from "./search-list-job.ts"

describe("search-list-job", () => {
  it("cancels the previous job when a new one starts", () => {
    const first = createSearchListJob(1, null)
    const second = createSearchListJob(2, first)
    assert.equal(first.cancelled, true)
    assert.equal(second.cancelled, false)
    assert.equal(isSearchListJobActive(first), false)
    assert.equal(isSearchListJobActive(second), true)
  })

  it("marks a job inactive after explicit cancel", () => {
    const job = createSearchListJob(1, null)
    cancelSearchListJob(job)
    assert.equal(isSearchListJobActive(job), false)
  })
})
