import { useEffect } from "react"

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

    chrome.tabs.onCreated.addListener(scheduleRefresh)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(scheduleRefresh)
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
      chrome.tabs.onCreated.removeListener(scheduleRefresh)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(scheduleRefresh)
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
