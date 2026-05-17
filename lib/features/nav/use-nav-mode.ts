import { useCallback, useEffect, useRef, useState } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { useWindowKeydownCapture } from "../side-picker/hooks/use-window-keydown-capture"
import { NAV_ARROW_STEP_PX } from "./nav-config"
import {
  clearNavTypingOnTab,
  clickNavOverlayOnTab,
  deleteNavBackwardOnTab,
  deleteNavForwardOnTab,
  forwardNavKeyOnTab,
  insertNavTextOnTab,
  moveNavOverlayOnTab,
  resolveActiveTargetTabId,
  resolveTabDisplayTitle,
  startNavOverlayOnTab,
  stopNavOverlayOnTab,
  type NavKeyForward,
  type NavPoint
} from "./nav-tab-bridge"
import { isNavPromptTextarea, navBeforeInputAction } from "./nav-prompt-input"

export type NavPositionsByTab = Record<number, NavPoint>

export type UseNavModeOptions = {
  armed: boolean
  active: boolean
  setActive: (v: boolean) => void
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  positionsRef: React.MutableRefObject<NavPositionsByTab>
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

const TYPING_FORWARD_KEYS = new Set([
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Enter"
])

function shouldForwardTypingKey(e: KeyboardEvent): boolean {
  if (e.key === "Escape" || e.key === "Alt") {
    return false
  }
  if (e.ctrlKey || e.metaKey) {
    return false
  }
  if (e.key.length === 1) {
    return true
  }
  return TYPING_FORWARD_KEYS.has(e.key)
}

function keyForwardFromEvent(e: KeyboardEvent): NavKeyForward {
  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey
  }
}

export const NAV_RESTORE_PROMPT_EVENT = "bmxt-nav-restore-prompt"

export function useNavMode({
  armed,
  active,
  setActive,
  isFocusedPane,
  paneFocus,
  positionsRef
}: UseNavModeOptions): {
  currentTabTitle: string | null
  overlayError: string | null
  typingMode: boolean
  toggleActive: () => void
  teardownAll: () => Promise<void>
  navKeyboardEnabled: boolean
  navTypingMode: boolean
} {
  const [currentTabTitle, setCurrentTabTitle] = useState<string | null>(null)
  const [overlayError, setOverlayError] = useState<string | null>(null)
  const [typingMode, setTypingMode] = useState(false)
  const activeRef = useRef(active)
  const armedRef = useRef(armed)
  const typingModeRef = useRef(typingMode)
  const lastOverlayTabRef = useRef<number | null>(null)
  /** EN: Alt ON → center; tab switch → remembered position. */
  const useCenterOnNextShowRef = useRef(true)

  activeRef.current = active
  armedRef.current = armed
  typingModeRef.current = typingMode

  const navKeyboardEnabled =
    armed && active && isFocusedPane && paneFocus === "terminal" && !typingMode

  const navTypingMode =
    armed && active && isFocusedPane && paneFocus === "terminal" && typingMode

  const exitTypingMode = useCallback((tabId: number | null) => {
    setTypingMode(false)
    if (tabId !== null) {
      void clearNavTypingOnTab(tabId)
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
    setTypingMode(false)
    await Promise.all([...tabs].map((id) => stopNavOverlayOnTab(id)))
    lastOverlayTabRef.current = null
    setCurrentTabTitle(null)
    setOverlayError(null)
    useCenterOnNextShowRef.current = true
  }, [positionsRef])

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
      setTypingMode(false)
    }
    setActive(next)
    if (next) {
      void showOverlayOnActiveTab()
    } else {
      void syncOverlayForTab(lastOverlayTabRef.current ?? undefined, false, false)
    }
  }, [isFocusedPane, paneFocus, setActive, showOverlayOnActiveTab, syncOverlayForTab])

  useEffect(() => {
    if (!armed) {
      void teardownAll()
      setActive(false)
      setTypingMode(false)
    }
  }, [armed, setActive, teardownAll])

  useEffect(() => {
    if (!armed || !active) {
      setTypingMode(false)
      return
    }
    const onActivated = (info: chrome.tabs.TabActiveInfo) => {
      useCenterOnNextShowRef.current = false
      setTypingMode(false)
      void syncOverlayForTab(info.tabId, true, false)
    }
    chrome.tabs.onActivated.addListener(onActivated)
    return () => chrome.tabs.onActivated.removeListener(onActivated)
  }, [armed, active, syncOverlayForTab])

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
    if (!navTypingMode) {
      return
    }

    const onBeforeInput = (e: Event) => {
      if (!typingModeRef.current || !(e instanceof InputEvent)) {
        return
      }
      if (!isNavPromptTextarea(e.target)) {
        return
      }
      e.preventDefault()
      e.stopImmediatePropagation()
      const tabId = lastOverlayTabRef.current
      if (tabId === null) {
        return
      }
      const action = navBeforeInputAction(e.inputType, e.data)
      if (action === "backward") {
        void deleteNavBackwardOnTab(tabId)
      } else if (action === "forward") {
        void deleteNavForwardOnTab(tabId)
      } else if (action === "insert" && e.data) {
        void insertNavTextOnTab(tabId, e.data).then(() => {
          window.dispatchEvent(new Event(NAV_RESTORE_PROMPT_EVENT))
        })
      }
    }

    const onCompositionEnd = (e: Event) => {
      if (!typingModeRef.current || !(e instanceof CompositionEvent)) {
        return
      }
      if (!isNavPromptTextarea(e.target)) {
        return
      }
      e.preventDefault()
      e.stopImmediatePropagation()
      const tabId = lastOverlayTabRef.current
      if (tabId === null || !e.data) {
        return
      }
      void insertNavTextOnTab(tabId, e.data).then(() => {
        window.dispatchEvent(new Event(NAV_RESTORE_PROMPT_EVENT))
      })
    }

    window.addEventListener("beforeinput", onBeforeInput, true)
    window.addEventListener("compositionend", onCompositionEnd, true)
    return () => {
      window.removeEventListener("beforeinput", onBeforeInput, true)
      window.removeEventListener("compositionend", onCompositionEnd, true)
    }
  }, [navTypingMode])

  const onWindowKeydownCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!armed || !active || !isFocusedPane || paneFocus !== "terminal") {
        return
      }
      if (e.key === "Alt") {
        return
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      const tabId = lastOverlayTabRef.current
      if (tabId === null) {
        return
      }

      if (typingModeRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          exitTypingMode(tabId)
          return
        }
        if (ev.isComposing) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (e.key === "Backspace") {
          e.preventDefault()
          e.stopPropagation()
          void deleteNavBackwardOnTab(tabId)
          return
        }
        if (e.key === "Delete") {
          e.preventDefault()
          e.stopPropagation()
          void deleteNavForwardOnTab(tabId)
          return
        }
        if (!shouldForwardTypingKey(e)) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        if (e.key.length === 1) {
          void insertNavTextOnTab(tabId, e.key)
          return
        }
        void forwardNavKeyOnTab(tabId, keyForwardFromEvent(e))
        return
      }

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
            setTypingMode(true)
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
    [armed, active, exitTypingMode, isFocusedPane, paneFocus, savePosition]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  return {
    currentTabTitle,
    overlayError,
    typingMode,
    toggleActive,
    teardownAll,
    navKeyboardEnabled,
    navTypingMode
  }
}
