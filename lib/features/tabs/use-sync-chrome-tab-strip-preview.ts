import { useCallback, useRef, type MutableRefObject } from "react"
import type { TabPickerRow } from "./picker-rows"
import type { SelectKind } from "./tab-picker-overlay-types"
import type { TabsPageActiveMode } from "./page-active-setting"
import {
  activateTabInBackground,
  type ActivateTabInBackgroundOptions
} from "../side-picker/preview/activate-tab-in-background"
import { requestFloatActivateHandoff } from "../bmxt-float/float-activate-handoff"
import { requestPopupTryReturnToFloat } from "../bmxt-float/request-popup-try-return-to-float"
import { markPickerSelfTabActivation } from "../side-picker/preview/picker-self-tab-activation"
import { usePickerAltPreviewSync } from "../side-picker/preview/use-picker-alt-preview-sync"

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
  altPreviewTick = 0,
  floatHostTabId = null,
  flushFloatPersist,
  getFloatPickersSnapshot,
  getPopupReturnPayload
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
  floatHostTabId?: number | null
  flushFloatPersist?: () => Promise<void>
  getFloatPickersSnapshot?: ActivateTabInBackgroundOptions["getFloatPickersSnapshot"]
  getPopupReturnPayload?: ActivateTabInBackgroundOptions["getPopupReturnPayload"]
}) {
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const appliedActiveTabIdRef = useRef<number | null>(null)
  const previewGenerationRef = useRef(0)
  const floatHostTabIdRef = useRef(floatHostTabId)
  floatHostTabIdRef.current = floatHostTabId
  const flushFloatPersistRef = useRef(flushFloatPersist)
  flushFloatPersistRef.current = flushFloatPersist
  const getFloatPickersSnapshotRef = useRef(getFloatPickersSnapshot)
  getFloatPickersSnapshotRef.current = getFloatPickersSnapshot
  const getPopupReturnPayloadRef = useRef(getPopupReturnPayload)
  getPopupReturnPayloadRef.current = getPopupReturnPayload

  const activateOpts = useCallback((): ActivateTabInBackgroundOptions => {
    return {
      floatHostTabId: floatHostTabIdRef.current,
      flushFloatPersist: flushFloatPersistRef.current,
      getFloatPickersSnapshot: getFloatPickersSnapshotRef.current,
      getPopupReturnPayload: getPopupReturnPayloadRef.current
    }
  }, [])

  /** EN: Move float onto dest even when the browser tab is already active (host mismatch). */
  const ensureFloatHandoffIfHostMismatch = useCallback(async (destTabId: number) => {
    const hostId = floatHostTabIdRef.current
    if (hostId == null || hostId === destTabId) {
      return
    }
    await requestFloatActivateHandoff({
      fromTabId: hostId,
      toTabId: destTabId,
      flushPersist: flushFloatPersistRef.current,
      pickersBySession: getFloatPickersSnapshotRef.current?.()
    })
  }, [])

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
            await ensureFloatHandoffIfHostMismatch(row.tabId)
            if (!isCurrent()) {
              return
            }
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          if (!(await activateTabInBackground(row.tabId, activateOpts()))) {
            return
          }
          if (!isCurrent()) {
            return
          }
          applyActiveTabId(row.tabId)
          return
        }

        const hiInMarked = markedInWin.includes(row.tabId)
        if (!hiInMarked) {
          if (targetTab.active) {
            await ensureFloatHandoffIfHostMismatch(row.tabId)
            if (!isCurrent()) {
              return
            }
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          if (!(await activateTabInBackground(row.tabId, activateOpts()))) {
            return
          }
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
            await ensureFloatHandoffIfHostMismatch(row.tabId)
            if (!isCurrent()) {
              return
            }
            applyActiveTabId(row.tabId)
            return
          }
          if (!isCurrent()) {
            return
          }
          if (!(await activateTabInBackground(row.tabId, activateOpts()))) {
            return
          }
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
        if (floatHostTabIdRef.current != null) {
          await requestFloatActivateHandoff({
            fromTabId: floatHostTabIdRef.current,
            toTabId: row.tabId,
            flushPersist: flushFloatPersistRef.current,
            pickersBySession: getFloatPickersSnapshotRef.current?.()
          })
        }
        if (!isCurrent()) {
          return
        }
        markPickerSelfTabActivation(row.tabId)
        await chrome.tabs.highlight({ windowId: winId, tabs: tabsArg })
        if (!isCurrent()) {
          return
        }
        applyActiveTabId(row.tabId)
        if (floatHostTabIdRef.current == null && getPopupReturnPayloadRef.current) {
          const payload = getPopupReturnPayloadRef.current()
          void requestPopupTryReturnToFloat({
            toTabId: row.tabId,
            sessions: payload.sessions,
            browse: payload.browse,
            pickersBySession: payload.pickersBySession
          })
        }
      } catch {
        /* tab/window may have closed */
      }
    },
    [
      activateOpts,
      ensureFloatHandoffIfHostMismatch,
      markedKind,
      markedTabIds,
      setActiveTabId,
      tabIdToWindowId
    ]
  )

  const rowIndex = visibleRowIndices[hi]
  const row = rowIndex !== undefined ? rowsRef.current[rowIndex] : undefined
  const markedKey =
    markedKind === "tab" ? markedTabIds.slice().sort((a, b) => a - b).join(",") : ""
  const previewKey =
    row && row.kind === "tab" ? `${hi}:${row.tabId}:${markedKey}` : ""

  const runPreview = useCallback(() => {
    if (visibleRowIndices.length === 0 || mirrorHiPendingRef.current) {
      return
    }
    const ri = visibleRowIndices[hi]
    if (ri === undefined) {
      return
    }
    const r = rowsRef.current[ri]
    if (!r || r.kind !== "tab") {
      return
    }
    const generation = ++previewGenerationRef.current
    void syncChromeTabStripPreview(ri, r.tabId, generation)
  }, [hi, mirrorHiPendingRef, syncChromeTabStripPreview, visibleRowIndices])

  usePickerAltPreviewSync({
    enabled: visibleRowIndices.length > 0,
    isHostPaneFocused,
    mode: pageActiveMode,
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    isBlocked: () => mirrorHiPendingRef.current,
    runPreview
  })
}
