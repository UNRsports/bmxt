import { useEffect, useState } from "react"
import { displayTitle } from "./picker-rows"

const TRACKED_TITLE_DEBOUNCE_MS = 400

/**
 * EN: Live tracked-window id/title from `activeTabId` (Chrome APIs), not row snapshots.
 * JA: 行データ再構築を待たず、追跡ウィンドウ名を安定表示する。
 */
export function useTrackedWindowDisplay(activeTabId: number | null): {
  trackedWindowId: number | undefined
  trackedWindowTitle: string | null
} {
  const [trackedWindowId, setTrackedWindowId] = useState<number | undefined>(undefined)
  const [trackedWindowTitle, setTrackedWindowTitle] = useState<string | null>(null)

  useEffect(() => {
    if (activeTabId === null) {
      setTrackedWindowId(undefined)
      setTrackedWindowTitle(null)
      return
    }

    let cancelled = false

    const applyTab = (tab: chrome.tabs.Tab) => {
      if (cancelled) {
        return
      }
      if (tab.windowId !== undefined) {
        setTrackedWindowId(tab.windowId)
      }
      setTrackedWindowTitle(displayTitle(tab.title ?? ""))
    }

    void (async () => {
      try {
        const tab = await chrome.tabs.get(activeTabId)
        applyTab(tab)
      } catch {
        if (!cancelled) {
          setTrackedWindowId(undefined)
          setTrackedWindowTitle(null)
        }
      }
    })()

    let titleDebounceTimer: ReturnType<typeof setTimeout> | undefined

    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (tabId !== activeTabId) {
        return
      }
      if (changeInfo.title === undefined) {
        return
      }
      const nextTitle = displayTitle(changeInfo.title)
      if (titleDebounceTimer !== undefined) {
        clearTimeout(titleDebounceTimer)
      }
      titleDebounceTimer = setTimeout(() => {
        titleDebounceTimer = undefined
        if (!cancelled) {
          setTrackedWindowTitle(nextTitle)
        }
      }, TRACKED_TITLE_DEBOUNCE_MS)
    }

    chrome.tabs.onUpdated.addListener(onUpdated)

    return () => {
      cancelled = true
      if (titleDebounceTimer !== undefined) {
        clearTimeout(titleDebounceTimer)
      }
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [activeTabId])

  return { trackedWindowId, trackedWindowTitle }
}
