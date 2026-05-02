import { useCallback, useEffect } from "react"
import type { TabPickerRow } from "./picker-rows"
import type { SelectKind } from "./tab-picker-overlay-types"

export function useSyncChromeTabStripPreview({
  hi,
  visibleRowIndices,
  rows,
  markedKind,
  markedTabIds,
  tabIdToWindowId,
  setActiveTabId
}: {
  hi: number
  visibleRowIndices: number[]
  rows: TabPickerRow[]
  markedKind: SelectKind | null
  markedTabIds: number[]
  tabIdToWindowId: Map<number, number>
  setActiveTabId: (id: number | null) => void
}) {
  const syncChromeTabStripPreview = useCallback(
    async (rowIndex: number) => {
      const row = rows[rowIndex]
      if (!row || row.kind !== "tab") {
        return
      }
      const winId = row.windowId
      const markedInWin =
        markedKind === "tab"
          ? markedTabIds.filter((id) => tabIdToWindowId.get(id) === winId)
          : []

      try {
        const tabsInWin = await chrome.tabs.query({ windowId: winId })
        if (markedInWin.length === 0) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const hiInMarked = markedInWin.includes(row.tabId)
        if (!hiInMarked) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const indices = markedInWin
          .map((id) => tabsInWin.find((t) => t.id === id)?.index)
          .filter((x): x is number => x !== undefined)
          .sort((a, b) => a - b)

        if (indices.length === 0) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const hiIdx = tabsInWin.find((t) => t.id === row.tabId)?.index
        const tabsArg =
          hiIdx !== undefined && indices.includes(hiIdx)
            ? [hiIdx, ...indices.filter((i) => i !== hiIdx)]
            : indices

        await chrome.tabs.highlight({ windowId: winId, tabs: tabsArg })
        setActiveTabId(row.tabId)
      } catch {
        /* tab/window may have closed */
      }
    },
    [markedKind, markedTabIds, rows, setActiveTabId, tabIdToWindowId]
  )

  useEffect(() => {
    if (visibleRowIndices.length === 0) {
      return
    }
    const rowIndex = visibleRowIndices[hi]!
    void syncChromeTabStripPreview(rowIndex)
  }, [hi, markedTabIds, visibleRowIndices, syncChromeTabStripPreview])
}
