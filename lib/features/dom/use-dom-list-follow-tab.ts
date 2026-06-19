import { useCallback, useEffect, useRef } from "react"
import { BMXT_WINDOW_ID_KEY } from "../extension-storage/keys"
import type { DomListPickerState } from "./dom-list-picker-input"

const FOLLOW_DEBOUNCE_MS = 300

type Props = {
  domListPicker: DomListPickerState | null
  resolveTargetTabId: () => Promise<number | undefined>
  refreshDomList: (commandLine: string) => Promise<void>
  /** EN: When provided, skip refresh while a `dom-list` job is in flight. */
  isDomListJobActive?: () => boolean
}

/**
 * EN: While the DOM list picker shows captured lines, re-run `dom -list` when the target
 *     tab changes (browser activation, window focus, or tabs picker hi on a tab row).
 * JA: DOM 行ピッカー表示中、対象タブが変わったら `dom -list` を再実行して列を更新する。
 */
export function useDomListFollowTab({
  domListPicker,
  resolveTargetTabId,
  refreshDomList,
  isDomListJobActive
}: Props): {
  onTabsPickerFocusTabId: (tabId: number | null) => void
} {
  const lastTabIdRef = useRef<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef = useRef(refreshDomList)
  const resolveRef = useRef(resolveTargetTabId)
  const domListPickerRef = useRef(domListPicker)
  const isActiveRef = useRef(isDomListJobActive)
  isActiveRef.current = isDomListJobActive

  useEffect(() => {
    refreshRef.current = refreshDomList
  }, [refreshDomList])

  useEffect(() => {
    resolveRef.current = resolveTargetTabId
  }, [resolveTargetTabId])

  useEffect(() => {
    domListPickerRef.current = domListPicker
    if (domListPicker?.kind === "lines") {
      lastTabIdRef.current = domListPicker.targetTabId ?? null
    }
  }, [domListPicker])

  const runRefreshIfNeeded = useCallback(async () => {
    const picker = domListPickerRef.current
    if (!picker || picker.kind !== "lines") {
      return
    }
    if (isActiveRef.current?.()) {
      return
    }
    const nextId = await resolveRef.current()
    if (nextId === undefined) {
      if (lastTabIdRef.current === null) {
        return
      }
    } else if (nextId === lastTabIdRef.current) {
      return
    }
    await refreshRef.current(picker.commandLine)
  }, [])

  const queueRefresh = useCallback(() => {
    const picker = domListPickerRef.current
    if (!picker || picker.kind !== "lines") {
      return
    }
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void runRefreshIfNeeded()
    }, FOLLOW_DEBOUNCE_MS)
  }, [runRefreshIfNeeded])

  const onTabsPickerFocusTabId = useCallback(
    (_tabId: number | null) => {
      queueRefresh()
    },
    [queueRefresh]
  )

  useEffect(() => {
    if (domListPicker?.kind !== "lines") {
      return
    }

    const onActivated = (_activeInfo: chrome.tabs.TabActiveInfo) => {
      void (async () => {
        const storage = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
        const bmxtWid = storage[BMXT_WINDOW_ID_KEY] as number | undefined
        if (bmxtWid !== undefined && _activeInfo.windowId === bmxtWid) {
          return
        }
        queueRefresh()
      })()
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
        try {
          const win = await chrome.windows.get(windowId)
          if (win.type !== "normal") {
            return
          }
        } catch {
          return
        }
        queueRefresh()
      })()
    }

    chrome.tabs.onActivated.addListener(onActivated)
    chrome.windows.onFocusChanged.addListener(onFocusChanged)

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.windows.onFocusChanged.removeListener(onFocusChanged)
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [domListPicker?.kind, domListPicker?.commandLine, queueRefresh])

  return { onTabsPickerFocusTabId }
}
