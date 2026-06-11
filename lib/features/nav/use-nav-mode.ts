import { useCallback, useEffect, useRef, useState } from "react"
import {
  canScriptHttpHostPages,
  requestOptionalHttpHostAccess
} from "../extension-permissions/optional-http-hosts"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { useWindowKeydownCapture } from "../side-picker/hooks/use-window-keydown-capture"
import { NAV_ARROW_STEP_PX } from "./nav-config"
import { attachNavKeyHold } from "./nav-key-hold"
import type { NavInjectTextSelPhase } from "./nav-overlay-inject-fn"
import type { NavControlResult } from "./nav-tab-bridge"
import {
  applyNavTypingOnTab,
  clearNavTypingOnTab,
  clickNavOverlayOnTab,
  moveNavOverlayOnTab,
  navMenuInputOnTab,
  resolveActiveTargetTabId,
  resolveTabDisplayTitle,
  revertNavTypingOnTab,
  startNavOverlayOnTab,
  stopNavOverlayOnTab,
  textSelCancelOnTab,
  textSelMarkOnTab,
  toggleNavMenuOnTab,
  type NavMenuInput,
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
  /** EN: When set, Alt-hold commit uses this instead of `getTypingBuffer` (e.g. English from Translator). */
  resolveTypingCommitText?: () => Promise<string>
  /** EN: `translate -on` assist — suspend nav Ctrl menu while BMXt focus is outside nav. */
  translateAssistActive?: boolean
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

type NavInjectStateRefs = {
  menuOpenRef: React.MutableRefObject<boolean>
  textSelPhaseRef: React.MutableRefObject<NavInjectTextSelPhase | null>
  menuSuspendedRef: React.MutableRefObject<boolean>
}

type NavUiSetters = {
  setMenuOpen: (v: boolean) => void
  setTextSelPhase: (v: NavInjectTextSelPhase | null) => void
}

function injectTextSelPhase(
  phase: NavInjectTextSelPhase | undefined
): NavInjectTextSelPhase | null {
  if (phase === undefined || phase === "idle") {
    return null
  }
  return phase
}

function isTextSelPickingPhase(phase: NavInjectTextSelPhase | null): boolean {
  return phase === "start" || phase === "end"
}

function isTextSelPickingRef(refs: NavInjectStateRefs): boolean {
  return isTextSelPickingPhase(refs.textSelPhaseRef.current)
}

function isTextSelDoneRef(refs: NavInjectStateRefs): boolean {
  return refs.textSelPhaseRef.current === "done"
}

function setNavUiState(
  refs: NavInjectStateRefs,
  setters: NavUiSetters,
  patch: { menuOpen?: boolean; textSelPhase?: NavInjectTextSelPhase | null }
): void {
  if (patch.menuOpen !== undefined) {
    if (!patch.menuOpen) {
      refs.menuSuspendedRef.current = false
    }
    refs.menuOpenRef.current = patch.menuOpen
    setters.setMenuOpen(patch.menuOpen)
  }
  if (patch.textSelPhase !== undefined) {
    refs.textSelPhaseRef.current = patch.textSelPhase
    setters.setTextSelPhase(patch.textSelPhase)
  }
}

function resetNavUiState(refs: NavInjectStateRefs, setters: NavUiSetters): void {
  refs.menuSuspendedRef.current = false
  setNavUiState(refs, setters, { menuOpen: false, textSelPhase: null })
}

function writeTextToSystemClipboard(text: string): void {
  void navigator.clipboard.writeText(text).catch(() => {
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand("copy")
      ta.remove()
    } catch {
      /* clipboard unavailable */
    }
  })
}

function applyNavInjectState(
  res: NavControlResult,
  setters: NavUiSetters,
  refs: NavInjectStateRefs
): void {
  if (!res.ok) {
    return
  }
  const patch: { menuOpen?: boolean; textSelPhase?: NavInjectTextSelPhase | null } = {}
  if (res.menuOpen !== undefined) {
    patch.menuOpen = res.menuOpen
  }
  if (res.textSelPhase !== undefined) {
    patch.textSelPhase = injectTextSelPhase(res.textSelPhase)
  }
  if (patch.menuOpen !== undefined || patch.textSelPhase !== undefined) {
    setNavUiState(refs, setters, patch)
  }
  if (res.navCopiedText) {
    writeTextToSystemClipboard(res.navCopiedText)
  }
}

function keyToMenuInput(key: string): NavMenuInput | null {
  switch (key) {
    case "ArrowUp":
      return "up"
    case "ArrowDown":
      return "down"
    case "ArrowLeft":
      return "left"
    case "ArrowRight":
      return "right"
    default:
      return null
  }
}

export function useNavMode({
  armed,
  active,
  setActive,
  isFocusedPane,
  paneFocus,
  positionsRef,
  getTypingBuffer,
  resolveTypingCommitText,
  translateAssistActive = false
}: UseNavModeOptions): {
  currentTabTitle: string | null
  overlayError: string | null
  typingMode: boolean
  typingMultiline: boolean
  menuOpen: boolean
  textSelPhase: NavInjectTextSelPhase | null
  toggleActive: () => void
  teardownAll: () => Promise<void>
  navKeyboardEnabled: boolean
  navTypingMode: boolean
  textSelPicking: boolean
} {
  const [currentTabTitle, setCurrentTabTitle] = useState<string | null>(null)
  const [overlayError, setOverlayError] = useState<string | null>(null)
  const [typingMode, setTypingMode] = useState(false)
  const [typingMultiline, setTypingMultiline] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [textSelPhase, setTextSelPhase] = useState<NavInjectTextSelPhase | null>(null)
  const activeRef = useRef(active)
  const armedRef = useRef(armed)
  const typingModeRef = useRef(typingMode)
  const typingMultilineRef = useRef(typingMultiline)
  const menuOpenRef = useRef(false)
  const menuSuspendedRef = useRef(false)
  const textSelPhaseRef = useRef<NavInjectTextSelPhase | null>(null)
  const getTypingBufferRef = useRef(getTypingBuffer)
  const resolveTypingCommitTextRef = useRef(resolveTypingCommitText)
  const lastOverlayTabRef = useRef<number | null>(null)
  const useCenterOnNextShowRef = useRef(true)

  const navUiRefs: NavInjectStateRefs = { menuOpenRef, textSelPhaseRef, menuSuspendedRef }
  const navUiSetters: NavUiSetters = { setMenuOpen, setTextSelPhase }

  activeRef.current = active
  armedRef.current = armed
  typingModeRef.current = typingMode
  typingMultilineRef.current = typingMultiline
  getTypingBufferRef.current = getTypingBuffer
  resolveTypingCommitTextRef.current = resolveTypingCommitText

  const textSelPicking = isTextSelPickingPhase(textSelPhase)

  const navKeyboardEnabled =
    armed &&
    active &&
    isFocusedPane &&
    paneFocus === "terminal" &&
    !typingMode &&
    !menuOpen &&
    !textSelPicking

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
    async (
      tabId: number | undefined,
      show: boolean,
      useCenter: boolean
    ): Promise<string | undefined> => {
      const prev = lastOverlayTabRef.current
      if (prev !== null && prev !== tabId) {
        exitTypingMode(prev)
        resetNavUiState(navUiRefs, navUiSetters)
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
        resetNavUiState(navUiRefs, navUiSetters)
        return undefined
      }
      const pos = useCenter ? null : (positionsRef.current[tabId] ?? null)
      const res = await startNavOverlayOnTab(tabId, pos, useCenter)
      if (res.ok) {
        savePosition(tabId, { x: res.x, y: res.y })
        setOverlayError(null)
        applyNavInjectState(res, navUiSetters, navUiRefs)
      } else {
        const reason = "reason" in res ? res.reason : undefined
        setOverlayError(overlayErrorLabel(reason))
      }
      lastOverlayTabRef.current = tabId
      setCurrentTabTitle(await resolveTabDisplayTitle(tabId))
      return res.ok ? undefined : "reason" in res ? res.reason : undefined
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
    resetNavUiState(navUiRefs, navUiSetters)
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
    const reason = await syncOverlayForTab(tabId, true, useCenter)
    if (reason === "permission-denied" && !(await canScriptHttpHostPages())) {
      const granted = await requestOptionalHttpHostAccess()
      if (granted) {
        await syncOverlayForTab(tabId, true, useCenter)
      }
    }
  }, [syncOverlayForTab])

  const toggleActive = useCallback(() => {
    if (!armedRef.current || !isFocusedPane) {
      return
    }
    if (paneFocus !== "terminal" && paneFocus !== "detailBar") {
      return
    }
    const next = !activeRef.current
    if (next) {
      useCenterOnNextShowRef.current = true
    } else {
      exitTypingMode(lastOverlayTabRef.current)
      resetNavUiState(navUiRefs, navUiSetters)
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
    try {
      const resolve = resolveTypingCommitTextRef.current
      const text = resolve ? await resolve() : getTypingBufferRef.current()
      await applyNavTypingOnTab(tabId, text)
      exitTypingMode(tabId)
    } catch {
      /* EN: e.g. Translator commit failed — stay in typing mode. */
    }
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
    resetNavUiState(navUiRefs, navUiSetters)
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
      resetNavUiState(navUiRefs, navUiSetters)
    }
  }, [armed, setActive, teardownAll])

  useEffect(() => {
    if (!armed || !active) {
      exitTypingMode(lastOverlayTabRef.current)
      resetNavUiState(navUiRefs, navUiSetters)
      return
    }
    const onActivated = (info: chrome.tabs.TabActiveInfo) => {
      useCenterOnNextShowRef.current = false
      exitTypingMode(lastOverlayTabRef.current)
      resetNavUiState(navUiRefs, navUiSetters)
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

  const applyNavResult = useCallback((res: NavControlResult) => {
    applyNavInjectState(res, navUiSetters, navUiRefs)
  }, [])

  const navProcessFocused = isFocusedPane && paneFocus === "terminal"

  useEffect(() => {
    if (!armed || !active) {
      menuSuspendedRef.current = false
      return
    }
    const tabId = lastOverlayTabRef.current
    if (tabId === null) {
      return
    }

    if (
      translateAssistActive &&
      menuOpen &&
      !navProcessFocused &&
      !menuSuspendedRef.current
    ) {
      menuSuspendedRef.current = true
      void navMenuInputOnTab(tabId, "close").then((res) => {
        applyNavInjectState(res, navUiSetters, navUiRefs)
        if (menuSuspendedRef.current && menuOpenRef.current) {
          setNavUiState(navUiRefs, navUiSetters, { menuOpen: true })
        }
      })
      return
    }

    if (menuSuspendedRef.current && navProcessFocused && menuOpen) {
      menuSuspendedRef.current = false
      void toggleNavMenuOnTab(tabId).then(applyNavResult)
    }
  }, [
    armed,
    active,
    translateAssistActive,
    navProcessFocused,
    menuOpen,
    applyNavResult
  ])

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
          const ev = e as KeyboardEvent & { isComposing?: boolean }
          if (ev.isComposing) {
            return
          }
          if (e.shiftKey && typingMultilineRef.current) {
            return
          }
          e.preventDefault()
          e.stopPropagation()
          return
        }
        return
      }

      if (isTextSelPickingRef(navUiRefs)) {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          void textSelCancelOnTab(tabId).then(applyNavResult)
          return
        }
        if (e.key === "Control") {
          e.preventDefault()
          e.stopPropagation()
          if (!e.repeat) {
            void textSelCancelOnTab(tabId).then(applyNavResult)
          }
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          void textSelMarkOnTab(tabId).then(applyNavResult)
          return
        }
        const delta = arrowDelta(e.key)
        if (delta) {
          e.preventDefault()
          e.stopPropagation()
          void moveNavOverlayOnTab(tabId, delta.dx, delta.dy).then((res) => {
            if (res.ok) {
              savePosition(tabId, { x: res.x, y: res.y })
            }
            applyNavResult(res)
          })
        }
        return
      }

      if (isTextSelDoneRef(navUiRefs) && !menuOpenRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          void textSelCancelOnTab(tabId).then(applyNavResult)
          return
        }
      }

      if (menuOpenRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          e.stopPropagation()
          setNavUiState(navUiRefs, navUiSetters, { menuOpen: false })
          void navMenuInputOnTab(tabId, "close").then(applyNavResult)
          return
        }
        if (e.key === "Control") {
          e.preventDefault()
          e.stopPropagation()
          if (!e.repeat) {
            setNavUiState(navUiRefs, navUiSetters, { menuOpen: false })
            void toggleNavMenuOnTab(tabId).then(applyNavResult)
          }
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          e.stopPropagation()
          setNavUiState(navUiRefs, navUiSetters, { menuOpen: false })
          void navMenuInputOnTab(tabId, "activate").then((res) => {
            if (res.ok) {
              applyNavResult(res)
            } else {
              setNavUiState(navUiRefs, navUiSetters, { menuOpen: true })
            }
          })
          return
        }
        const menuInput = keyToMenuInput(e.key)
        if (menuInput) {
          e.preventDefault()
          e.stopPropagation()
          void navMenuInputOnTab(tabId, menuInput).then(applyNavResult)
          return
        }
        return
      }

      if (e.key === "Control") {
        e.preventDefault()
        e.stopPropagation()
        if (!e.repeat) {
          setNavUiState(navUiRefs, navUiSetters, { menuOpen: true })
          void toggleNavMenuOnTab(tabId).then((res) => {
            if (res.ok) {
              applyNavResult(res)
            } else {
              setNavUiState(navUiRefs, navUiSetters, { menuOpen: false })
            }
          })
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
        applyNavResult(res)
      })
    },
    [armed, active, applyNavResult, enterTypingFromClick, isFocusedPane, paneFocus, savePosition]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  return {
    currentTabTitle,
    overlayError,
    typingMode,
    typingMultiline,
    menuOpen,
    textSelPhase,
    toggleActive,
    teardownAll,
    navKeyboardEnabled,
    navTypingMode,
    textSelPicking
  }
}
