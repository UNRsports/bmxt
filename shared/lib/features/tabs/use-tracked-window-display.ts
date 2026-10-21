import { useEffect, useState } from "react"
import { displayTitle } from "./picker-rows"
import { resolveLiveTabTitle } from "./tab-picker-live-tab-fields"
import { useTabPickerLiveFieldsRevision } from "./use-tab-picker-live-fields-revision"

/**
 * EN: Tracked-window id from Chrome; title from the unified live tab-fields store.
 * JA: ウィンドウ ID は Chrome API、タイトルは live fields 単一ソース。
 */
export function useTrackedWindowDisplay(activeTabId: number | null): {
  trackedWindowId: number | undefined
  trackedWindowTitle: string | null
} {
  const [trackedWindowId, setTrackedWindowId] = useState<number | undefined>(undefined)
  const [queryTitle, setQueryTitle] = useState<string>("")
  useTabPickerLiveFieldsRevision()

  useEffect(() => {
    if (activeTabId === null) {
      setTrackedWindowId(undefined)
      setQueryTitle("")
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const tab = await chrome.tabs.get(activeTabId)
        if (cancelled) {
          return
        }
        if (tab.windowId !== undefined) {
          setTrackedWindowId(tab.windowId)
        }
        setQueryTitle(tab.title ?? "")
      } catch {
        if (!cancelled) {
          setTrackedWindowId(undefined)
          setQueryTitle("")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeTabId])

  if (activeTabId === null) {
    return { trackedWindowId: undefined, trackedWindowTitle: null }
  }

  const resolved = resolveLiveTabTitle(activeTabId, queryTitle)
  const trackedWindowTitle = resolved !== "" ? displayTitle(resolved) : null

  return { trackedWindowId, trackedWindowTitle }
}
