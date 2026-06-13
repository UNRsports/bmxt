import { useEffect, useLayoutEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import type { TabPickerRow } from "./picker-rows"
import { computeTabPickerVisibleRowIndices } from "./tab-picker-fold-state"
import { consumeTabPickerSelfActivation } from "./tab-picker-activation-suppression"
import { resolveMirrorBrowserWindowId } from "./resolve-mirror-browser-window"
import { BMXT_WINDOW_ID_KEY } from "../extension-storage/keys"

type Reason = "activated" | "focus"

function resolveVisibleHi(
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  rowIdx: number
): number {
  const fromProp = visibleRowIndices.findIndex((ri) => ri === rowIdx)
  if (fromProp >= 0) {
    return fromProp
  }
  const visibleNow = computeTabPickerVisibleRowIndices(rows)
  return visibleNow.findIndex((ri) => ri === rowIdx)
}

/**
 * Chrome 側のアクティブタブをピッカーの hi / activeTabId に反映する（ブラウザ → BMXt の一方通行）。
 * 最前面のブラウザウィンドウ（BMXt 以外がフォーカスならそれ、BMXt フォーカス時は storage の last normal）に合わせる。
 * アクティブタブが折りたたみ内にある場合はツリーを展開する（ブラウザ操作優先）。
 */
export function useMirrorBrowserActiveTab({
  enabled,
  blocked,
  rows,
  visibleRowIndices,
  setHi,
  setMoveDestHi,
  setActiveTabId,
  setFilterQuery,
  setSearchMode,
  anchorTabIdRef,
  expandForTabId,
  mirrorHiPendingRef,
  altKeyHeldRef,
  onRefreshRows,
  scheduleRefreshRows
}: {
  enabled: boolean
  blocked: boolean
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  setHi: (n: number) => void
  setMoveDestHi: (n: number) => void
  setActiveTabId: (id: number | null) => void
  setFilterQuery: (q: string) => void
  setSearchMode: (v: boolean) => void
  anchorTabIdRef: MutableRefObject<number | null>
  expandForTabId: (tabId: number) => boolean
  /** EN: True while browser-side active tab changed but hi has not caught up yet. */
  mirrorHiPendingRef: MutableRefObject<boolean>
  /** EN: Alt-held picker preview — do not move hi toward Chrome activation. */
  altKeyHeldRef?: MutableRefObject<boolean>
  onRefreshRows?: () => Promise<void>
  /** EN: Debounced row rebuild for browser event mirroring (avoids refresh races). */
  scheduleRefreshRows?: () => void
}): void {
  const pendingTabIdRef = useRef<number | null>(null)
  const lastMirroredTabIdRef = useRef<number | null>(null)

  const handlerRef = useRef<
    ((tabId: number, windowId: number, reason: Reason) => void | Promise<void>) | null
  >(null)

  useLayoutEffect(() => {
    handlerRef.current = async (tabId: number, windowId: number, reason: Reason) => {
      if (!enabled) {
        return
      }

      if (reason === "activated" && consumeTabPickerSelfActivation(tabId)) {
        return
      }

      const storage = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
      const bmxtWid = storage[BMXT_WINDOW_ID_KEY] as number | undefined
      if (bmxtWid !== undefined && windowId === bmxtWid) {
        return
      }

      if (reason === "activated") {
        const mirror = await resolveMirrorBrowserWindowId()
        if (mirror === undefined || windowId !== mirror) {
          return
        }
      } else {
        try {
          const win = await chrome.windows.get(windowId)
          if (win.type !== "normal") {
            return
          }
        } catch {
          return
        }
      }

      setActiveTabId(tabId)
      lastMirroredTabIdRef.current = tabId

      let rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tabId)
      if (rowIdx < 0) {
        mirrorHiPendingRef.current = true
        pendingTabIdRef.current = tabId
        await onRefreshRows?.()
        return
      }

      expandForTabId(tabId)

      let vHi = resolveVisibleHi(rows, visibleRowIndices, rowIdx)
      if (vHi < 0) {
        setFilterQuery("")
        setSearchMode(false)
        vHi = resolveVisibleHi(rows, visibleRowIndices, rowIdx)
      }
      if (vHi < 0) {
        mirrorHiPendingRef.current = true
        pendingTabIdRef.current = tabId
        scheduleRefreshRows?.()
        return
      }

      pendingTabIdRef.current = null
      if (blocked) {
        mirrorHiPendingRef.current = true
        scheduleRefreshRows?.()
        return
      }
      if (altKeyHeldRef?.current) {
        return
      }
      mirrorHiPendingRef.current = false
      setHi(vHi)
      setMoveDestHi(vHi)
      anchorTabIdRef.current = tabId
    }
  }, [
    enabled,
    blocked,
    rows,
    visibleRowIndices,
    setHi,
    setMoveDestHi,
    setActiveTabId,
    setFilterQuery,
    setSearchMode,
    anchorTabIdRef,
    expandForTabId,
    mirrorHiPendingRef,
    altKeyHeldRef,
    onRefreshRows,
    scheduleRefreshRows
  ])

  useEffect(() => {
    const pending = pendingTabIdRef.current
    if (pending === null || !enabled) {
      return
    }

    setActiveTabId(pending)
    lastMirroredTabIdRef.current = pending

    const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === pending)
    if (rowIdx < 0) {
      return
    }

    expandForTabId(pending)

    const vHi = resolveVisibleHi(rows, visibleRowIndices, rowIdx)
    if (vHi < 0) {
      return
    }

    pendingTabIdRef.current = null
    if (blocked) {
      mirrorHiPendingRef.current = true
      return
    }
    if (altKeyHeldRef?.current) {
      return
    }
    mirrorHiPendingRef.current = false
    setHi(vHi)
    setMoveDestHi(vHi)
    anchorTabIdRef.current = pending
  }, [
    enabled,
    blocked,
    rows,
    visibleRowIndices,
    setHi,
    setMoveDestHi,
    setActiveTabId,
    anchorTabIdRef,
    expandForTabId,
    mirrorHiPendingRef,
    altKeyHeldRef
  ])

  useEffect(() => {
    if (!enabled || blocked || !mirrorHiPendingRef.current) {
      return
    }
    if (altKeyHeldRef?.current) {
      return
    }
    const tabId = pendingTabIdRef.current ?? lastMirroredTabIdRef.current
    if (tabId === null) {
      return
    }
    const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tabId)
    if (rowIdx < 0) {
      return
    }
    expandForTabId(tabId)
    const vHi = resolveVisibleHi(rows, visibleRowIndices, rowIdx)
    if (vHi < 0) {
      return
    }
    pendingTabIdRef.current = null
    mirrorHiPendingRef.current = false
    setHi(vHi)
    setMoveDestHi(vHi)
    anchorTabIdRef.current = tabId
  }, [
    enabled,
    blocked,
    rows,
    visibleRowIndices,
    setHi,
    setMoveDestHi,
    expandForTabId,
    anchorTabIdRef,
    mirrorHiPendingRef,
    altKeyHeldRef
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      void handlerRef.current?.(activeInfo.tabId, activeInfo.windowId, "activated")
    }

    const onFocusChanged = (windowId: number) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return
      }
      void (async () => {
        const storage = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
        const bmxtWid = storage[BMXT_WINDOW_ID_KEY] as number | undefined
        if (bmxtWid !== undefined && windowId === bmxtWid) {
          return
        }
        let tabs: chrome.tabs.Tab[]
        try {
          tabs = await chrome.tabs.query({ windowId, active: true })
        } catch {
          return
        }
        const t = tabs[0]
        if (!t?.id) {
          return
        }
        await handlerRef.current?.(t.id, windowId, "focus")
      })()
    }

    chrome.tabs.onActivated.addListener(onActivated)
    chrome.windows.onFocusChanged.addListener(onFocusChanged)

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.windows.onFocusChanged.removeListener(onFocusChanged)
    }
  }, [enabled])
}
