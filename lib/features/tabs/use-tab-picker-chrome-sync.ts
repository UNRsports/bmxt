import { useEffect } from "react"
import {
  isTitleOnlyTabUpdate,
  shouldRefreshOnTabUpdated
} from "./tab-picker-chrome-sync-filters"

const TITLE_REFRESH_DEBOUNCE_MS = 400

/**
 * タブピッカー表示中に tabs / windows / tabGroups の変化を追従する。
 * `scheduleRefresh` はデバウンス済みの行再構築を呼ぶ（重複 refresh の競合を避ける）。
 */
export function useTabPickerChromeSync(
  scheduleRefresh: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let titleDebounceTimer: ReturnType<typeof setTimeout> | undefined

    const scheduleTitleRefresh = () => {
      if (titleDebounceTimer !== undefined) {
        clearTimeout(titleDebounceTimer)
      }
      titleDebounceTimer = setTimeout(() => {
        titleDebounceTimer = undefined
        scheduleRefresh()
      }, TITLE_REFRESH_DEBOUNCE_MS)
    }

    const onTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (!shouldRefreshOnTabUpdated(changeInfo)) {
        return
      }
      if (isTitleOnlyTabUpdate(changeInfo)) {
        scheduleTitleRefresh()
        return
      }
      scheduleRefresh()
    }

    chrome.tabs.onCreated.addListener(scheduleRefresh)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onActivated.addListener(scheduleRefresh)
    chrome.tabs.onMoved.addListener(scheduleRefresh)
    chrome.tabs.onAttached.addListener(scheduleRefresh)
    chrome.tabs.onDetached.addListener(scheduleRefresh)
    chrome.tabs.onReplaced.addListener(scheduleRefresh)

    chrome.windows.onCreated.addListener(scheduleRefresh)
    chrome.windows.onRemoved.addListener(scheduleRefresh)
    chrome.windows.onFocusChanged.addListener(scheduleRefresh)

    chrome.tabGroups.onCreated.addListener(scheduleRefresh)
    chrome.tabGroups.onUpdated.addListener(scheduleRefresh)
    chrome.tabGroups.onRemoved.addListener(scheduleRefresh)
    chrome.tabGroups.onMoved.addListener(scheduleRefresh)

    return () => {
      if (titleDebounceTimer !== undefined) {
        clearTimeout(titleDebounceTimer)
      }

      chrome.tabs.onCreated.removeListener(scheduleRefresh)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onActivated.removeListener(scheduleRefresh)
      chrome.tabs.onMoved.removeListener(scheduleRefresh)
      chrome.tabs.onAttached.removeListener(scheduleRefresh)
      chrome.tabs.onDetached.removeListener(scheduleRefresh)
      chrome.tabs.onReplaced.removeListener(scheduleRefresh)

      chrome.windows.onCreated.removeListener(scheduleRefresh)
      chrome.windows.onRemoved.removeListener(scheduleRefresh)
      chrome.windows.onFocusChanged.removeListener(scheduleRefresh)

      chrome.tabGroups.onCreated.removeListener(scheduleRefresh)
      chrome.tabGroups.onUpdated.removeListener(scheduleRefresh)
      chrome.tabGroups.onRemoved.removeListener(scheduleRefresh)
      chrome.tabGroups.onMoved.removeListener(scheduleRefresh)
    }
  }, [enabled, scheduleRefresh])
}
