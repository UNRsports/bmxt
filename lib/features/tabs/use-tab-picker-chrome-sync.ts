import { useEffect } from "react"
import {
  isTitleOnlyTabUpdate,
  shouldRefreshOnTabUpdated
} from "./tab-picker-chrome-sync-filters"
import { consumeTabPickerSelfActivation } from "./tab-picker-activation-suppression"

const TITLE_PATCH_DEBOUNCE_MS = 400

/**
 * タブピッカー表示中に tabs / windows / tabGroups の変化を追従する。
 * `scheduleRefresh` はデバウンス済みの行再構築を呼ぶ（重複 refresh の競合を避ける）。
 */
export function useTabPickerChromeSync(
  scheduleRefresh: () => void,
  enabled: boolean,
  onTabTitleUpdated?: (tabId: number, title: string) => void
) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const titlePatchTimers = new Map<number, ReturnType<typeof setTimeout>>()
    const pendingTitles = new Map<number, string>()

    const scheduleTitlePatch = (tabId: number, title: string) => {
      pendingTitles.set(tabId, title)
      const prev = titlePatchTimers.get(tabId)
      if (prev !== undefined) {
        clearTimeout(prev)
      }
      titlePatchTimers.set(
        tabId,
        setTimeout(() => {
          titlePatchTimers.delete(tabId)
          const nextTitle = pendingTitles.get(tabId)
          pendingTitles.delete(tabId)
          if (nextTitle !== undefined) {
            onTabTitleUpdated?.(tabId, nextTitle)
          }
        }, TITLE_PATCH_DEBOUNCE_MS)
      )
    }

    const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (!shouldRefreshOnTabUpdated(changeInfo)) {
        return
      }
      if (isTitleOnlyTabUpdate(changeInfo)) {
        const title = changeInfo.title
        if (title !== undefined && onTabTitleUpdated !== undefined) {
          scheduleTitlePatch(tabId, title)
          return
        }
        return
      }
      scheduleRefresh()
    }

    const onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      if (consumeTabPickerSelfActivation(activeInfo.tabId)) {
        return
      }
      scheduleRefresh()
    }

    chrome.tabs.onCreated.addListener(scheduleRefresh)
    chrome.tabs.onRemoved.addListener(scheduleRefresh)
    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.tabs.onActivated.addListener(onActivated)
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
      for (const timer of titlePatchTimers.values()) {
        clearTimeout(timer)
      }
      titlePatchTimers.clear()
      pendingTitles.clear()

      chrome.tabs.onCreated.removeListener(scheduleRefresh)
      chrome.tabs.onRemoved.removeListener(scheduleRefresh)
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.tabs.onActivated.removeListener(onActivated)
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
  }, [enabled, onTabTitleUpdated, scheduleRefresh])
}
