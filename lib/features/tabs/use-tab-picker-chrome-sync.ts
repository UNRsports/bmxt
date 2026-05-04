import { useEffect } from "react"

const DEBOUNCE_MS = 80

/**
 * タブピッカー表示中に tabs / windows / tabGroups の変化を追従する。
 * デバウンスして連続イベントをまとめ、`refresh` で行データを再構築する。
 */
export function useTabPickerChromeSync(
  refresh: () => void | Promise<void>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined
        void refresh()
      }, DEBOUNCE_MS)
    }

    chrome.tabs.onCreated.addListener(schedule)
    chrome.tabs.onRemoved.addListener(schedule)
    chrome.tabs.onUpdated.addListener(schedule)
    chrome.tabs.onMoved.addListener(schedule)
    chrome.tabs.onAttached.addListener(schedule)
    chrome.tabs.onDetached.addListener(schedule)
    chrome.tabs.onReplaced.addListener(schedule)

    chrome.windows.onCreated.addListener(schedule)
    chrome.windows.onRemoved.addListener(schedule)
    chrome.windows.onFocusChanged.addListener(schedule)

    chrome.tabGroups.onCreated.addListener(schedule)
    chrome.tabGroups.onUpdated.addListener(schedule)
    chrome.tabGroups.onRemoved.addListener(schedule)
    chrome.tabGroups.onMoved.addListener(schedule)

    return () => {
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer)
      }

      chrome.tabs.onCreated.removeListener(schedule)
      chrome.tabs.onRemoved.removeListener(schedule)
      chrome.tabs.onUpdated.removeListener(schedule)
      chrome.tabs.onMoved.removeListener(schedule)
      chrome.tabs.onAttached.removeListener(schedule)
      chrome.tabs.onDetached.removeListener(schedule)
      chrome.tabs.onReplaced.removeListener(schedule)

      chrome.windows.onCreated.removeListener(schedule)
      chrome.windows.onRemoved.removeListener(schedule)
      chrome.windows.onFocusChanged.removeListener(schedule)

      chrome.tabGroups.onCreated.removeListener(schedule)
      chrome.tabGroups.onUpdated.removeListener(schedule)
      chrome.tabGroups.onRemoved.removeListener(schedule)
      chrome.tabGroups.onMoved.removeListener(schedule)
    }
  }, [enabled, refresh])
}
