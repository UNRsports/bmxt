import { useEffect, useLayoutEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import type { TabPickerRow } from "./picker-rows"
import { resolveMirrorBrowserWindowId } from "./resolve-mirror-browser-window"
import { BMXT_WINDOW_ID_KEY } from "../extension-storage/keys"

type Reason = "activated" | "focus"

/**
 * Chrome 側のアクティブタブをピッカーの hi / activeTabId に反映する（ブラウザ → BMXt の一方通行）。
 * 最前面のブラウザウィンドウ（BMXt 以外がフォーカスならそれ、BMXt フォーカス時は storage の last normal）に合わせる。
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
  onRefreshRows
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
  onRefreshRows?: () => Promise<void>
}): void {
  const pendingTabIdRef = useRef<number | null>(null)

  const handlerRef = useRef<
    ((tabId: number, windowId: number, reason: Reason) => void | Promise<void>) | null
  >(null)

  useLayoutEffect(() => {
    handlerRef.current = async (tabId: number, windowId: number, reason: Reason) => {
      if (!enabled || blocked) {
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

      let rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tabId)
      if (rowIdx < 0) {
        pendingTabIdRef.current = tabId
        await onRefreshRows?.()
        return
      }

      const vHi = visibleRowIndices.findIndex((ri) => ri === rowIdx)
      if (vHi < 0) {
        pendingTabIdRef.current = tabId
        setFilterQuery("")
        setSearchMode(false)
        return
      }

      pendingTabIdRef.current = null
      setHi(vHi)
      setMoveDestHi(vHi)
      setActiveTabId(tabId)
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
    onRefreshRows
  ])

  useEffect(() => {
    const pending = pendingTabIdRef.current
    if (pending === null || !enabled || blocked) {
      return
    }
    const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === pending)
    if (rowIdx < 0) {
      return
    }
    const vHi = visibleRowIndices.findIndex((ri) => ri === rowIdx)
    if (vHi < 0) {
      return
    }
    pendingTabIdRef.current = null
    setHi(vHi)
    setMoveDestHi(vHi)
    setActiveTabId(pending)
    anchorTabIdRef.current = pending
  }, [
    enabled,
    blocked,
    rows,
    visibleRowIndices,
    setHi,
    setMoveDestHi,
    setActiveTabId,
    anchorTabIdRef
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
