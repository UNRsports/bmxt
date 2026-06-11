/** EN: Decide whether `tabs.onUpdated` should trigger a tab-picker row rebuild. */

export function shouldRefreshOnTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return (
    changeInfo.title !== undefined ||
    changeInfo.url !== undefined ||
    changeInfo.status !== undefined ||
    changeInfo.groupId !== undefined ||
    changeInfo.pinned !== undefined ||
    changeInfo.discarded !== undefined
  )
}

/** EN: Title-only updates are debounced longer to avoid SPA title churn flicker. */
export function isTitleOnlyTabUpdate(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  if (changeInfo.title === undefined) {
    return false
  }
  return (
    changeInfo.url === undefined &&
    changeInfo.status === undefined &&
    changeInfo.groupId === undefined &&
    changeInfo.pinned === undefined &&
    changeInfo.discarded === undefined
  )
}
