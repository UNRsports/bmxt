import { useCallback, useEffect, useRef, type MutableRefObject } from "react"
import type { TabPickerRow } from "./picker-rows"
import type { SelectKind } from "./tab-picker-overlay-types"
import type { TabsPageActiveMode } from "./page-active-setting"
import { markTabPickerSelfActivation } from "./tab-picker-activation-suppression"

export function useSyncChromeTabStripPreview({
  hi,
  visibleRowIndices,
  rows,
  markedKind,
  markedTabIds,
  tabIdToWindowId,
  setActiveTabId,
  pageActiveMode,
  altKeyHeldRef,
  mirrorHiPendingRef,
  isHostPaneFocused,
  altPreviewTick = 0
}: {
  hi: number
  visibleRowIndices: number[]
  rows: TabPickerRow[]
  markedKind: SelectKind | null
  markedTabIds: number[]
  tabIdToWindowId: Map<number, number>
  setActiveTabId: (id: number | null) => void
  pageActiveMode: TabsPageActiveMode
  altKeyHeldRef: MutableRefObject<boolean>
  mirrorHiPendingRef: MutableRefObject<boolean>
  /** EN: When false (BMXt pane unfocused / window in background), do not touch Chrome tab strip. */
  isHostPaneFocused: boolean
  /** EN: Bumped on Alt keydown in manual mode to re-run preview without moving hi. */
  altPreviewTick?: number
}) {
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const appliedActiveTabIdRef = useRef<number | null>(null)
  const lastPreviewKeyRef = useRef("")
  const previewGenerationRef = useRef(0)

  const syncChromeTabStripPreview = useCallback(
    async (rowIndex: number, expectedTabId: number, generation: number) => {
      const isCurrent = (): boolean => generation === previewGenerationRef.current

      const row = rowsRef.current[rowIndex]
      if (!row || row.kind !== "tab" || row.tabId !== expectedTabId) {
        return
      }
      const winId = row.windowId
      const markedInWin =
        markedKind === "tab"
          ? markedTabIds.filter((id) => tabIdToWindowId.get(id) === winId)
          : []

      const applyActiveTabId = (tabId: number) => {
        if (appliedActiveTabIdRef.current === tabId) {
          return
        }
        appliedActiveTabIdRef.current = tabId
        setActiveTabId(tabId)
      }

      try {
        const tabsInWin = await chrome.tabs.query({ windowId: winId })
        if (!isCurrent()) {
          return
        }
        const targetTab = tabsInWin.find((t) => t.id === row.tabId)
        if (!targetTab) {
          return
        }

        if (markedInWin.length === 0) {
          if (targetTab.active) {
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          markTabPickerSelfActivation(row.tabId)
          await chrome.tabs.update(row.tabId, { active: true })
          if (!isCurrent()) {
            return
          }
          applyActiveTabId(row.tabId)
          return
        }

        const hiInMarked = markedInWin.includes(row.tabId)
        if (!hiInMarked) {
          if (targetTab.active) {
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          markTabPickerSelfActivation(row.tabId)
          await chrome.tabs.update(row.tabId, { active: true })
          if (!isCurrent()) {
            return
          }
          applyActiveTabId(row.tabId)
          return
        }

        const indices = markedInWin
          .map((id) => tabsInWin.find((t) => t.id === id)?.index)
          .filter((x): x is number => x !== undefined)
          .sort((a, b) => a - b)

        if (indices.length === 0) {
          if (targetTab.active) {
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          markTabPickerSelfActivation(row.tabId)
          await chrome.tabs.update(row.tabId, { active: true })
          if (!isCurrent()) {
            return
          }
          applyActiveTabId(row.tabId)
          return
        }

        const hiIdx = tabsInWin.find((t) => t.id === row.tabId)?.index
        const tabsArg =
          hiIdx !== undefined && indices.includes(hiIdx)
            ? [hiIdx, ...indices.filter((i) => i !== hiIdx)]
            : indices

        if (!isCurrent()) {
          return
        }
        markTabPickerSelfActivation(row.tabId)
        await chrome.tabs.highlight({ windowId: winId, tabs: tabsArg })
        if (!isCurrent()) {
          return
        }
        applyActiveTabId(row.tabId)
      } catch {
        /* tab/window may have closed */
      }
    },
    [markedKind, markedTabIds, setActiveTabId, tabIdToWindowId]
  )

  useEffect(() => {
    if (!isHostPaneFocused) {
      lastPreviewKeyRef.current = ""
      return
    }
    if (visibleRowIndices.length === 0) {
      return
    }
    if (mirrorHiPendingRef.current) {
      return
    }
    if (pageActiveMode === "manual" && !altKeyHeldRef.current) {
      return
    }
    const rowIndex = visibleRowIndices[hi]
    if (rowIndex === undefined) {
      return
    }
    const row = rowsRef.current[rowIndex]
    if (!row || row.kind !== "tab") {
      return
    }
    const markedKey =
      markedKind === "tab" ? markedTabIds.slice().sort((a, b) => a - b).join(",") : ""
    const previewKey = `${hi}:${row.tabId}:${markedKey}`
    if (lastPreviewKeyRef.current === previewKey) {
      return
    }
    lastPreviewKeyRef.current = previewKey
    const generation = ++previewGenerationRef.current
    void syncChromeTabStripPreview(rowIndex, row.tabId, generation)
  }, [
    altKeyHeldRef,
    hi,
    isHostPaneFocused,
    markedKind,
    markedTabIds,
    mirrorHiPendingRef,
    pageActiveMode,
    setActiveTabId,
    visibleRowIndices,
    syncChromeTabStripPreview,
    altPreviewTick
  ])
}
