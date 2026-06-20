import type { HistoryCacheEntry } from "./types"
import {
  flushPendingHistoryCacheWrites,
  flushPendingPageCacheRemovals,
  queueHistoryCacheVisit,
  scheduleBookmarkCacheRebuild,
  scheduleDeferredSearchCacheWarm,
  scheduleHistoryCacheFlush,
  schedulePageCacheFlush,
  queuePageCacheTabRemoval
} from "./maintainer/search-cache-maintainer"

let listenersRegistered = false

function historyEntryFromItem(it: chrome.history.HistoryItem): HistoryCacheEntry | null {
  const url = it.url ?? ""
  if (!url) {
    return null
  }
  return {
    url,
    title: it.title ?? "",
    lastVisitTime: it.lastVisitTime ?? 0
  }
}

function onHistoryVisited(item: chrome.history.HistoryItem): void {
  const row = historyEntryFromItem(item)
  if (!row) {
    return
  }
  queueHistoryCacheVisit(row)
  scheduleHistoryCacheFlush()
}

function onBookmarkTreeChanged(): void {
  scheduleBookmarkCacheRebuild()
}

function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo): void {
  if (changeInfo.url !== undefined) {
    queuePageCacheTabRemoval(tabId)
    schedulePageCacheFlush()
  }
}

function onTabRemoved(tabId: number): void {
  queuePageCacheTabRemoval(tabId)
  schedulePageCacheFlush()
}

/** EN: Low-priority cache maintenance — debounced, off the command hot path. */
export function registerSearchCacheBackgroundListeners(): void {
  if (listenersRegistered) {
    return
  }
  listenersRegistered = true

  chrome.history.onVisited.addListener(onHistoryVisited)
  chrome.bookmarks.onCreated.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onChanged.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onMoved.addListener(onBookmarkTreeChanged)
  chrome.bookmarks.onRemoved.addListener(onBookmarkTreeChanged)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    onTabUpdated(tabId, changeInfo)
  })
  chrome.tabs.onRemoved.addListener(onTabRemoved)
}

/** EN: Defer initial warm so SW command dispatch is not blocked at startup. */
export function scheduleSearchCacheMaintenanceStartup(): void {
  scheduleDeferredSearchCacheWarm()
}

/** EN: @deprecated Use `scheduleSearchCacheMaintenanceStartup`. */
export function warmSearchCachesOnStartup(): void {
  scheduleSearchCacheMaintenanceStartup()
}

export {
  flushPendingHistoryCacheWrites,
  flushPendingPageCacheRemovals
} from "./maintainer/search-cache-maintainer"
