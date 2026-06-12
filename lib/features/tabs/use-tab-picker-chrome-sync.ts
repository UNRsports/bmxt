import { useEffect } from "react"
import {
  shouldHandleTabUpdated,
  shouldRebuildRowsOnTabUpdated
} from "./tab-picker-chrome-sync-filters"
import {
  applyTabPickerLiveFieldsFromChrome,
  forgetTabPickerLiveFields
} from "./tab-picker-live-tab-fields"

/**
 * タブピッカー表示中に tabs / windows / tabGroups の変化を追従する。
 * タイトル・URL は row 再構築ではなく live fields ストアへ集約する。
 * `scheduleRefresh` は構造変化時のみ（デバウンス済み行再構築）。
 */
export function useTabPickerChromeSync(
  scheduleRefresh: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (!shouldHandleTabUpdated(changeInfo)) {
        return
      }
      applyTabPickerLiveFieldsFromChrome(tabId, changeInfo)
      if (shouldRebuildRowsOnTabUpdated(changeInfo)) {
        scheduleRefresh()
      }
    }

    const onRemoved = (tabId: number) => {
      forgetTabPickerLiveFields(tabId)
      scheduleRefresh()
    }

    chrome.tabs.onCreated.addListener(scheduleRefresh)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onMoved.addListener(scheduleRefresh)
    chrome.tabs.onAttached.addListener(scheduleRefresh)
    chrome.tabs.onDetached.addListener(scheduleRefresh)
    chrome.tabs.onReplaced.addListener(scheduleRefresh)

    chrome.windows.onCreated.addListener(scheduleRefresh)
    chrome.windows.onRemoved.addListener(scheduleRefresh)

    chrome.tabGroups.onCreated.addListener(scheduleRefresh)
    chrome.tabGroups.onUpdated.addListener(scheduleRefresh)
    chrome.tabGroups.onRemoved.addListener(scheduleRefresh)
    chrome.tabGroups.onMoved.addListener(scheduleRefresh)

    return () => {
      chrome.tabs.onCreated.removeListener(scheduleRefresh)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onMoved.removeListener(scheduleRefresh)
      chrome.tabs.onAttached.removeListener(scheduleRefresh)
      chrome.tabs.onDetached.removeListener(scheduleRefresh)
      chrome.tabs.onReplaced.removeListener(scheduleRefresh)

      chrome.windows.onCreated.removeListener(scheduleRefresh)
      chrome.windows.onRemoved.removeListener(scheduleRefresh)

      chrome.tabGroups.onCreated.removeListener(scheduleRefresh)
      chrome.tabGroups.onUpdated.removeListener(scheduleRefresh)
      chrome.tabGroups.onRemoved.removeListener(scheduleRefresh)
      chrome.tabGroups.onMoved.removeListener(scheduleRefresh)
    }
  }, [enabled, scheduleRefresh])
}
