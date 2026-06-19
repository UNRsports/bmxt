import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { bookmarkTreeRevision } from "./bookmark-revision.ts"
import { isHistoryCacheEntryFresh, isPageTabCacheEntryFresh } from "./stale.ts"
import type { HistoryCacheEntry, PageTabCacheEntry } from "./types.ts"

describe("search cache stale detection", () => {
  it("page: misses when URL differs", () => {
    const entry: PageTabCacheEntry = {
      tabId: 1,
      url: "https://a.example/",
      title: "A",
      windowId: 1,
      text: "hello",
      dataTimestamp: 100,
      fetchedAt: 100
    }
    assert.equal(isPageTabCacheEntryFresh(entry, "https://b.example/", 100), false)
  })

  it("page: misses when tab was accessed after cache timestamp", () => {
    const entry: PageTabCacheEntry = {
      tabId: 1,
      url: "https://a.example/",
      title: "A",
      windowId: 1,
      text: "hello",
      dataTimestamp: 100,
      fetchedAt: 100
    }
    assert.equal(isPageTabCacheEntryFresh(entry, "https://a.example/", 101), false)
    assert.equal(isPageTabCacheEntryFresh(entry, "https://a.example/", 100), true)
  })

  it("history: misses when lastVisitTime is newer than cache", () => {
    const cached: HistoryCacheEntry = {
      url: "https://a.example/",
      title: "A",
      lastVisitTime: 100
    }
    assert.equal(isHistoryCacheEntryFresh(cached, "https://a.example/", 101), false)
    assert.equal(isHistoryCacheEntryFresh(cached, "https://a.example/", 100), true)
  })
})

describe("bookmarkTreeRevision", () => {
  it("changes when a node dateAdded changes", () => {
    const treeA = [
      {
        id: "1",
        title: "",
        dateAdded: 1,
        children: [{ id: "2", title: "x", url: "https://x/", dateAdded: 2 }]
      }
    ] as chrome.bookmarks.BookmarkTreeNode[]
    const treeB = [
      {
        id: "1",
        title: "",
        dateAdded: 1,
        children: [{ id: "2", title: "x", url: "https://x/", dateAdded: 3 }]
      }
    ] as chrome.bookmarks.BookmarkTreeNode[]
    assert.notEqual(bookmarkTreeRevision(treeA), bookmarkTreeRevision(treeB))
  })
})
