/** EN: Decide how `tabs.onUpdated` should update the tab picker. */

/** EN: Title field present — patch rows in place (debounced), even when `status` accompanies `title`. */
export function shouldPatchTitleOnTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return changeInfo.title !== undefined
}

/** EN: URL field present — patch tab row url/favicon in place (debounced with title). */
export function shouldPatchUrlOnTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return changeInfo.url !== undefined
}

/** EN: Structural fields that require rebuilding the full picker row list. */
export function shouldRebuildRowsOnTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return (
    changeInfo.groupId !== undefined ||
    changeInfo.pinned !== undefined ||
    changeInfo.discarded !== undefined
  )
}

/** EN: Any tab-picker-relevant change in this update payload (`status`-only is ignored). */
export function shouldHandleTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return (
    shouldPatchTitleOnTabUpdated(changeInfo) ||
    shouldPatchUrlOnTabUpdated(changeInfo) ||
    shouldRebuildRowsOnTabUpdated(changeInfo)
  )
}

/** @deprecated Use `shouldHandleTabUpdated`. */
export function shouldRefreshOnTabUpdated(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return shouldHandleTabUpdated(changeInfo)
}

/** EN: Display-field change without structural fields (`status` is not structural). */
export function isTitleOnlyTabUpdate(changeInfo: chrome.tabs.TabChangeInfo): boolean {
  return (
    (shouldPatchTitleOnTabUpdated(changeInfo) || shouldPatchUrlOnTabUpdated(changeInfo)) &&
    !shouldRebuildRowsOnTabUpdated(changeInfo)
  )
}
