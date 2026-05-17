import { useCallback, useEffect, useRef, useState } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { useWindowKeydownCapture } from "../side-picker/hooks/use-window-keydown-capture"
import { NAV_ARROW_STEP_PX } from "./nav-config"
import { attachNavKeyHold } from "./nav-key-hold"
import {
  applyNavTypingOnTab,
  clearNavTypingOnTab,
  clickNavOverlayOnTab,
  moveNavOverlayOnTab,
  resolveActiveTargetTabId,
  resolveTabDisplayTitle,
  revertNavTypingOnTab,
  startNavOverlayOnTab,
  stopNavOverlayOnTab,
  type NavPoint
} from "./nav-tab-bridge"

export type NavPositionsByTab = Record<number, NavPoint>

export type NavEnterTypingDetail = {
  multiline: boolean
  initialValue: string
}

export const NAV_ENTER_TYPING_EVENT = "bmxt-nav-enter-typing"
export const NAV_EXIT_TYPING_EVENT = "bmxt-nav-exit-typing"

export type UseNavModeOptions = {
  armed: boolean
  active: boolean
  setActive: (v: boolean) => void
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  positionsRef: React.MutableRefObject<NavPositionsByTab>
  getTypingBuffer: () => string
}

function overlayErrorLabel(reason: string | undefined): string {
  if (!reason) {
    return "overlay failed"
  }
  if (reason === "permission-denied") {
    return "site access denied"
  }
  if (reason === "not-scriptable") {
    return "page not scriptable"
  }
  if (reason === "no-result" || reason === "no-sw-response") {
    return "inject no result"
  }
  if (reason.startsWith("inject-failed:") || reason.startsWith("sw-message-failed:")) {
    return reason
  }
  return reason
}

function arrowDelta(key: string): { dx: number; dy: number } | null {
  switch (key) {
    case "ArrowLeft":
      return { dx: -NAV_ARROW_STEP_PX, dy: 0 }
    case "ArrowRight":
      return { dx: NAV_ARROW_STEP_PX, dy: 0 }
    case "ArrowUp":
      return { dx: 0, dy: -NAV_ARROW_STEP_PX }
    case "ArrowDown":
      return { dx: 0, dy: NAV_ARROW_STEP_PX }
    default:
      return null
  }
}

function dispatchEnterTyping(detail: NavEnterTypingDetail): void {
  window.dispatchEvent(new CustomEvent<NavEnterTypingDetail>(NAV_ENTER_TYPING_EVENT, { detail }))
}

function dispatchExitTyping(): void {
  window.dispatchEvent(new Event(NAV_EXIT_TYPING_EVENT))
}

export function useNavMode({
  armed,
  active,
  setActive,
  isFocusedPane,
  paneFocus,
  positionsRef,
  getTypingBuffer
}: UseNavModeOptions): {
  currentTabTitle: string | null
  overlayError: string | null
  typingMode: boolean
  typingMultiline: boolean
  toggleActive: () => void
  teardownAll: () => Promise<void>
  navKeyboardEnabled: boolean
  navTypingMode: boolean
} {
  const [currentTabTitle, setCurrentTabTitle] = useState<string | null>(null)
  const [overlayError, setOverlayError] = useState<string | null>(null)
  const [typingMode, setTypingMode] = useState(false)
  const [typingMultiline, setTypingMultiline] = useState(false)
  const activeRef = useRef(active)
  const armedRef = useRef(armed)
  const typingModeRef = useRef(typingMode)
  const getTypingBufferRef = useRef(getTypingBuffer)
  const lastOverlayTabRef = useRef<number | null>(null)
  const useCenterOnNextShowRef = useRef(true)

  activeRef.current = active
  armedRef.current = armed
  typingModeRef.current = typingMode
  getTypingBufferRef.current = getTypingBuffer

  const navKeyboardEnabled =
    armed && active && isFocusedPane && paneFocus === "terminal" && !typingMode

  const navTypingMode =
    armed && active && isFocusedPane && paneFocus === "terminal" && typingMode

  const exitTypingMode = useCallback((tabId: number | null) => {
    const wasTyping = typingModeRef.current
    setTypingMode(false)
    setTypingMultiline(false)
    if (tabId !== null) {
      void clearNavTypingOnTab(tabId)
    }
    if (wasTyping) {
      dispatchExitTyping()
    }
  }, [])

  const savePosition = useCallback(
    (tabId: number, point: NavPoint) => {
      positionsRef.current = { ...positionsRef.current, [tabId]: point }
    },
    [positionsRef]
  )

  const syncOverlayForTab = useCallback(
    async (tabId: number | undefined, show: boolean, useCenter: boolean) => {
      const prev = lastOverlayTabRef.current
      if (prev !== null && prev !== tabId) {
        exitTypingMode(prev)
        await stopNavOverlayOnTab(prev)
      }
      if (!show || tabId === undefined) {
        if (prev !== null) {
          exitTypingMode(prev)
          await stopNavOverlayOnTab(prev)
        }
        lastOverlayTabRef.current = null
        setCurrentTabTitle(null)
        setOverlayError(null)
        setTypingMode(false)
        setTypingMultiline(false)
        return
      }
      const pos = useCenter ? null : (positionsRef.current[tabId] ?? null)
      const res = await startNavOverlayOnTab(tabId, pos, useCenter)
      if (res.ok) {
        savePosition(tabId, { x: res.x, y: res.y })
        setOverlayError(null)
      } else {
        const reason = "reason" in res ? res.reason : undefined
        setOverlayError(overlayErrorLabel(reason))
      }
      lastOverlayTabRef.current = tabId
      setCurrentTabTitle(await resolveTabDisplayTitle(tabId))
    },
    [exitTypingMode, positionsRef, savePosition]
  )

  const teardownAll = useCallback(async () => {
    const tabs = new Set<number>()
    if (lastOverlayTabRef.current !== null) {
      tabs.add(lastOverlayTabRef.current)
    }
    for (const id of Object.keys(positionsRef.current)) {
      tabs.add(Number(id))
    }
    exitTypingMode(lastOverlayTabRef.current)
    await Promise.all([...tabs].map((id) => stopNavOverlayOnTab(id)))
    lastOverlayTabRef.current = null
    setCurrentTabTitle(null)
    setOverlayError(null)
    useCenterOnNextShowRef.current = true
  }, [exitTypingMode, positionsRef])

  const showOverlayOnActiveTab = useCallback(async () => {
    const tabId = await resolveActiveTargetTabId()
    if (tabId === undefined) {
      setOverlayError("no target tab")
      return
    }
    const useCenter = useCenterOnNextShowRef.current
    useCenterOnNextShowRef.current = false
    await syncOverlayForTab(tabId, true, useCenter)
  }, [syncOverlayForTab])

  const toggleActive = useCallback(() => {
    if (!armedRef.current || !isFocusedPane || paneFocus !== "terminal") {
      return
    }
    const next = !activeRef.current
    if (next) {
      useCenterOnNextShowRef.current = true
    } else {
      exitTypingMode(lastOverlayTabRef.current)
    }
    setActive(next)
    if (next) {
      void showOverlayOnActiveTab()
    } else {
      void syncOverlayForTab(lastOverlayTabRef.current ?? undefined, false, false)
    }
  }, [exitTypingMode, isFocusedPane, paneFocus, setActive, showOverlayOnActiveTab, syncOverlayForTab])

  const commitTyping = useCallback(async () => {
    const tabId = lastOverlayTabRef.current
    if (tabId === null || !typingModeRef.current) {
      return
    }
    await applyNavTypingOnTab(tabId, getTypingBufferRef.current())
    exitTypingMode(tabId)
  }, [exitTypingMode])

  const cancelTyping = useCallback(async () => {
    const tabId = lastOverlayTabRef.current
    if (tabId === null || !typingModeRef.current) {
      return
    }
    await revertNavTypingOnTab(tabId)
    exitTypingMode(tabId)
  }, [exitTypingMode])

  const enterTypingFromClick = useCallback((res: {
    typingMultiline?: boolean
    initialValue?: string
  }) => {
    const multiline = res.typingMultiline === true
    const initialValue = res.initialValue ?? ""
    setTypingMultiline(multiline)
    setTypingMode(true)
    dispatchEnterTyping({ multiline, initialValue })
  }, [])

  useEffect(() => {
    if (!armed) {
      void teardownAll()
      setActive(false)
      setTypingMode(false)
      setTypingMultiline(false)
    }
  }, [armed, setActive, teardownAll])

  useEffect(() => {
    if (!armed || !active) {
      exitTypingMode(lastOverlayTabRef.current)
      return
    }
    const onActivated = (info: chrome.tabs.TabActiveInfo) => {
      useCenterOnNextShowRef.current = false
      exitTypingMode(lastOverlayTabRef.current)
      void syncOverlayForTab(info.tabId, true, false)
    }
    chrome.tabs.onActivated.addListener(onActivated)
    return () => chrome.tabs.onActivated.removeListener(onActivated)
  }, [armed, active, exitTypingMode, syncOverlayForTab])

  useEffect(() => {
    if (!armed || !active) {
      return
    }
    const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (tabId !== lastOverlayTabRef.current) {
        return
      }
      if (changeInfo.title !== undefined || changeInfo.status === "complete") {
        void resolveTabDisplayTitle(tabId).then(setCurrentTabTitle)
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => chrome.tabs.onUpdated.removeListener(onUpdated)
  }, [armed, active])

  useEffect(() => {
    return attachNavKeyHold(navTypingMode, {
      onEscapeHold: () => {
        void cancelTyping()
      },
      onAltHold: () => {
        void commitTyping()
      }
    })
  }, [navTypingMode, cancelTyping, commitTyping])

  const onWindowKeydownCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!armed || !active || !isFocusedPane || paneFocus !== "terminal") {
        return
      }
      const tabId = lastOverlayTabRef.current
      if (tabId === null) {
        return
      }

      if (typingModeRef.current) {
        if (e.key === "Escape" || e.key === "Alt") {
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        return
      }

      if (e.key === "Alt") {
        return
      }

      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing && e.key !== "Escape") {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        e.stopPropagation()
        void clickNavOverlayOnTab(tabId).then((res) => {
          if (res.ok && res.editableFocused) {
            enterTypingFromClick(res)
          }
        })
        return
      }

      const delta = arrowDelta(e.key)
      if (!delta) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      void moveNavOverlayOnTab(tabId, delta.dx, delta.dy).then((res) => {
        if (res.ok) {
          savePosition(tabId, { x: res.x, y: res.y })
        }
      })
    },
    [armed, active, enterTypingFromClick, isFocusedPane, paneFocus, savePosition]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  return {
    currentTabTitle,
    overlayError,
    typingMode,
    typingMultiline,
    toggleActive,
    teardownAll,
    navKeyboardEnabled,
    navTypingMode
  }
}
