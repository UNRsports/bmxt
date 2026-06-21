import {
  rebuildBookmarkSearchCache,
  removePageCacheTab,
  upsertHistoryCacheOnVisit,
  warmSearchBookmarkCache,
  warmSearchHistoryCache
} from "./search-cache-store"

let listenersRegistered = false

function onHistoryVisited(item: chrome.history.HistoryItem): void {
  void upsertHistoryCacheOnVisit(item)
}

function onBookmarkTreeChanged(): void {
  void rebuildBookmarkSearchCache()
}

async function onTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
): Promise<void> {
  if (changeInfo.url !== undefined) {
    await removePageCacheTab(tabId)
  }
}

function onTabRemoved(tabId: number): void {
  void removePageCacheTab(tabId)
}

/** EN: Keep history/bookmark cache warm; drop legacy page_tab rows on tab close/navigation. */
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
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    void onTabUpdated(tabId, changeInfo, tab)
  })
  chrome.tabs.onRemoved.addListener(onTabRemoved)
}

/** EN: Initial fill when the service worker starts. */
export async function warmSearchCachesOnStartupAsync(): Promise<void> {
  await Promise.all([warmSearchHistoryCache(), warmSearchBookmarkCache()])
}

/** EN: Fire-and-forget warm (prefer deferred scheduler on SW wake). */
export function warmSearchCachesOnStartup(): void {
  void warmSearchCachesOnStartupAsync()
}
