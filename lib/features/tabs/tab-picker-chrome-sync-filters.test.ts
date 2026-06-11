import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isTitleOnlyTabUpdate,
  shouldRefreshOnTabUpdated
} from "./tab-picker-chrome-sync-filters.ts"

describe("tab-picker-chrome-sync-filters", () => {
  it("shouldRefreshOnTabUpdated ignores noisy fields", () => {
    assert.equal(shouldRefreshOnTabUpdated({}), false)
    assert.equal(shouldRefreshOnTabUpdated({ title: "x" }), true)
    assert.equal(shouldRefreshOnTabUpdated({ url: "https://a" }), true)
    assert.equal(shouldRefreshOnTabUpdated({ status: "loading" }), true)
  })

  it("isTitleOnlyTabUpdate matches title-only payloads", () => {
    assert.equal(isTitleOnlyTabUpdate({ title: "a" }), true)
    assert.equal(isTitleOnlyTabUpdate({ title: "a", url: "https://b" }), false)
    assert.equal(isTitleOnlyTabUpdate({ status: "complete" }), false)
  })
})
