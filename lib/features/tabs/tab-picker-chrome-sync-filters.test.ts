import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isTitleOnlyTabUpdate,
  shouldHandleTabUpdated,
  shouldPatchTitleOnTabUpdated,
  shouldPatchUrlOnTabUpdated,
  shouldRebuildRowsOnTabUpdated,
  shouldRefreshOnTabUpdated
} from "./tab-picker-chrome-sync-filters.ts"

describe("tab-picker-chrome-sync-filters", () => {
  it("shouldHandleTabUpdated ignores status-only and empty payloads", () => {
    assert.equal(shouldHandleTabUpdated({}), false)
    assert.equal(shouldHandleTabUpdated({ status: "loading" }), false)
    assert.equal(shouldHandleTabUpdated({ status: "complete" }), false)
    assert.equal(shouldHandleTabUpdated({ title: "x" }), true)
    assert.equal(shouldHandleTabUpdated({ url: "https://a" }), true)
  })

  it("shouldPatchTitleOnTabUpdated matches any title field", () => {
    assert.equal(shouldPatchTitleOnTabUpdated({ title: "a" }), true)
    assert.equal(shouldPatchTitleOnTabUpdated({ title: "a", status: "complete" }), true)
    assert.equal(shouldPatchTitleOnTabUpdated({ status: "complete" }), false)
  })

  it("shouldPatchUrlOnTabUpdated matches url without rebuild", () => {
    assert.equal(shouldPatchUrlOnTabUpdated({ url: "https://mail.google.com/#inbox" }), true)
    assert.equal(shouldRebuildRowsOnTabUpdated({ url: "https://a" }), false)
  })

  it("shouldRebuildRowsOnTabUpdated matches structural fields only", () => {
    assert.equal(shouldRebuildRowsOnTabUpdated({ title: "a" }), false)
    assert.equal(shouldRebuildRowsOnTabUpdated({ title: "a", status: "complete" }), false)
    assert.equal(shouldRebuildRowsOnTabUpdated({ url: "https://b" }), false)
    assert.equal(shouldRebuildRowsOnTabUpdated({ groupId: 1 }), true)
  })

  it("isTitleOnlyTabUpdate treats status and url as non-structural", () => {
    assert.equal(isTitleOnlyTabUpdate({ title: "a" }), true)
    assert.equal(isTitleOnlyTabUpdate({ title: "a", status: "complete" }), true)
    assert.equal(isTitleOnlyTabUpdate({ url: "https://a" }), true)
    assert.equal(isTitleOnlyTabUpdate({ title: "a", url: "https://b" }), true)
    assert.equal(isTitleOnlyTabUpdate({ title: "a", groupId: 1 }), false)
    assert.equal(isTitleOnlyTabUpdate({ status: "complete" }), false)
  })

  it("shouldRefreshOnTabUpdated aliases shouldHandleTabUpdated", () => {
    assert.equal(shouldRefreshOnTabUpdated({ status: "loading" }), false)
    assert.equal(shouldRefreshOnTabUpdated({ title: "x" }), true)
  })
})
