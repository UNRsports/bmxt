import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type MutableRefObject
} from "react"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../../command-line"
import {
  filterSessionSwitchPickerRows,
  parseSessionListPickerLine,
  resolveSessionSwitchPickerState,
  SessionListCandidatePanel,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../../session"
import { TokenPickerPanel, type TokenPickerModel } from "../token-picker-panel"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../csp-dynamic-stylesheet"
import type { PromptShellBridge } from "./prompt-shell-bridge"
import { measureFloatingPickerHostPosition } from "./measure-floating-picker-host"
import { shouldKeepSessionSwitchPickerOpen } from "./should-keep-session-switch-picker-open"

export type SessionListPickerContext = {
  rows: SessionListRow[]
  variant: SessionCandidatePanelVariant | null
  hi: number | null
}

export type BmxtPromptPickerHandle = {
  sync: (ln: string, pos: number) => void
  dismissToken: () => void
  closeAll: () => void
  getSubCmdPicker: () => TokenPickerModel | null
  isSessionListOpen: () => boolean
  getSessionListContext: () => SessionListPickerContext
  setSessionListPickerHi: React.Dispatch<React.SetStateAction<number | null>>
  nudgeSubCmdPickerHi: (delta: number) => void
  cycleSubCmdPickerHi: () => void
  clearSubCmdPicker: () => void
}

export type BmxtPromptPickerIslandProps = {
  sessionId: string
  scrollRef: RefObject<HTMLDivElement | null>
  promptPaneFocused: boolean
  sessionListRows: SessionListRow[]
  mode: "normal" | "isearch"
  navPageTyping: boolean
  completionCandidatesRef: RefObject<string[]>
  bridgeRef: RefObject<PromptShellBridge>
  cursorMirrorCellRef: RefObject<HTMLSpanElement | null>
  hostRef: RefObject<HTMLDivElement | null>
  allowEmptyFirstPickerSyncRef: MutableRefObject<boolean>
  tabPickerOpenRequestRef: MutableRefObject<boolean>
  imeTokenPickerDismissedRef: MutableRefObject<boolean>
  sessionListPickerDismissedRef: MutableRefObject<boolean>
  sessionNameTypingRef: RefObject<boolean>
  sessionListRowsRef: RefObject<SessionListRow[]>
  onPickerUiChange?: (state: {
    subCmdPickerOpen: boolean
    sessionListPickerOpen: boolean
  }) => void
}

/** EN: Token / session-list pickers — isolated so prompt keystrokes skip this subtree when closed. */
export const BmxtPromptPickerIsland = forwardRef<
  BmxtPromptPickerHandle,
  BmxtPromptPickerIslandProps
>(function BmxtPromptPickerIsland(props, ref) {
  const {
    sessionId,
    scrollRef,
    promptPaneFocused,
    sessionListRows,
    mode,
    navPageTyping,
    completionCandidatesRef,
    bridgeRef,
    cursorMirrorCellRef,
    hostRef,
    allowEmptyFirstPickerSyncRef,
    tabPickerOpenRequestRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    sessionNameTypingRef,
    sessionListRowsRef,
    onPickerUiChange
  } = props

  const [subCmdPicker, setSubCmdPicker] = useState<TokenPickerModel | null>(null)
  const subCmdPickerRef = useRef<TokenPickerModel | null>(null)
  subCmdPickerRef.current = subCmdPicker

  const [sessionListPickerHi, setSessionListPickerHi] = useState<number | null>(null)
  const sessionListPickerHiRef = useRef(sessionListPickerHi)
  sessionListPickerHiRef.current = sessionListPickerHi

  const [sessionPickerVariant, setSessionPickerVariant] = useState<SessionCandidatePanelVariant | null>(
    null
  )
  const sessionPickerVariantRef = useRef(sessionPickerVariant)
  sessionPickerVariantRef.current = sessionPickerVariant

  const [syncCursor, setSyncCursor] = useState({ line: "", pos: 0 })

  const sessionListPickerOpen = sessionListPickerHi !== null
  const promptPickerOpen = subCmdPicker !== null || sessionListPickerOpen

  const sessionListPickerRows = useMemo((): SessionListRow[] => {
    if (sessionPickerVariant !== "switch" || sessionListPickerHi === null) {
      return sessionListRows
    }
    const state = resolveSessionSwitchPickerState(syncCursor.line, syncCursor.pos)
    const namePrefix = state?.namePrefix ?? ""
    return filterSessionSwitchPickerRows(
      sessionListRows,
      namePrefix,
      incrementalPickerMatchMode(true)
    )
  }, [sessionListRows, sessionPickerVariant, sessionListPickerHi, syncCursor.line, syncCursor.pos])

  const sessionListPickerRowsRef = useRef(sessionListPickerRows)
  sessionListPickerRowsRef.current = sessionListPickerRows

  const [subCmdPickerPos, setSubCmdPickerPos] = useState<{ left: number; top: number } | null>(null)
  const subCmdPickerScopeId = `subcmd-picker-${sessionId}`
  const sessionListPickerScopeId = `session-list-picker-${sessionId}`
  const promptPickerScopeId = subCmdPicker
    ? subCmdPickerScopeId
    : sessionListPickerOpen
      ? sessionListPickerScopeId
      : null

  useCspDynamicStyle(
    promptPickerOpen && subCmdPickerPos && promptPickerScopeId ? promptPickerScopeId : null,
    subCmdPickerPos
      ? {
          left: `${subCmdPickerPos.left}px`,
          top: `${subCmdPickerPos.top}px`
        }
      : null
  )

  const subCmdPickerAnchorEpisode = useMemo(
    () =>
      subCmdPicker === null
        ? null
        : `${subCmdPicker.tier}\0${subCmdPicker.tokenStart}\0${subCmdPicker.candidates.join("\0")}`,
    [subCmdPicker]
  )

  const sessionListMenuAnchorEpisode = useMemo(
    () =>
      sessionListPickerHi === null
        ? null
        : sessionListPickerRows.map((r) => r.sessionId).join("\0"),
    [sessionListPickerHi, sessionListPickerRows]
  )

  useLayoutEffect(() => {
    if (!promptPickerOpen) {
      setSubCmdPickerPos(null)
      return
    }
    const measure = () => {
      const next = measureFloatingPickerHostPosition(
        cursorMirrorCellRef.current,
        hostRef.current
      )
      if (!next) {
        return
      }
      setSubCmdPickerPos((prev) => {
        if (prev && prev.left === next.left && prev.top === next.top) {
          return prev
        }
        return next
      })
    }
    measure()
    const raf = requestAnimationFrame(measure)
    const sc = scrollRef.current
    sc?.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf)
      sc?.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [
    subCmdPickerAnchorEpisode,
    sessionListMenuAnchorEpisode,
    mode,
    promptPickerOpen,
    cursorMirrorCellRef,
    hostRef,
    scrollRef
  ])

  const openSessionPicker = useCallback((variant: SessionCandidatePanelVariant) => {
    setSubCmdPicker(null)
    allowEmptyFirstPickerSyncRef.current = false
    const rows = sessionListRowsRef.current
    setSessionPickerVariant(variant)
    setSessionListPickerHi((prev) => {
      if (prev !== null && prev < rows.length) {
        return prev
      }
      const activeIdx = rows.findIndex((r) => r.isActive)
      return activeIdx >= 0 ? activeIdx : 0
    })
  }, [allowEmptyFirstPickerSyncRef, sessionListRowsRef])

  const sync = useCallback(
    (ln: string, pos: number) => {
      if (sessionPickerVariantRef.current === "switch" && sessionListPickerHiRef.current !== null) {
        setSyncCursor({ line: ln, pos })
      }
      if (bridgeRef.current.paneFocusRef.current !== "terminal") {
        return
      }
      if (sessionNameTypingRef.current) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        setSessionListPickerHi(null)
        return
      }
      if (navPageTyping) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        return
      }
      if (mode === "isearch") {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        setSessionListPickerHi(null)
        return
      }
      const switchState = resolveSessionSwitchPickerState(ln, pos)
      if (switchState !== null) {
        const allRows = sessionListRowsRef.current
        const keepOpen = shouldKeepSessionSwitchPickerOpen(ln, pos, allRows)
        if (!keepOpen) {
          setSubCmdPicker(null)
          setSessionListPickerHi(null)
          setSessionPickerVariant(null)
          sessionListPickerDismissedRef.current = true
          return
        }
        sessionListPickerDismissedRef.current = false
        setSubCmdPicker(null)
        const namePrefix = switchState.namePrefix
        const matchMode = incrementalPickerMatchMode(sessionListPickerHiRef.current !== null)
        const filtered = filterSessionSwitchPickerRows(allRows, namePrefix, matchMode)
        setSessionPickerVariant("switch")
        setSyncCursor({ line: ln, pos })
        setSessionListPickerHi((prev) => {
          if (filtered.length === 0) {
            return 0
          }
          const prevRows = sessionListPickerRowsRef.current
          if (prev !== null && prevRows[prev]) {
            const idx = filtered.findIndex((r) => r.sessionId === prevRows[prev]!.sessionId)
            if (idx >= 0) {
              return idx
            }
          }
          const activeIdx = filtered.findIndex((r) => r.isActive)
          return activeIdx >= 0 ? activeIdx : 0
        })
        return
      }
      if (parseSessionListPickerLine(ln)) {
        if (sessionListPickerDismissedRef.current) {
          setSubCmdPicker(null)
          setSessionListPickerHi(null)
          setSessionPickerVariant(null)
          return
        }
        setSubCmdPicker(null)
        openSessionPicker("list")
        return
      }
      sessionListPickerDismissedRef.current = false
      setSessionListPickerHi(null)
      setSessionPickerVariant(null)
      if (imeTokenPickerDismissedRef.current) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        tabPickerOpenRequestRef.current = false
        return
      }
      const pickerAlreadyOpen = subCmdPickerRef.current !== null
      const tabOpenRequested = tabPickerOpenRequestRef.current
      const emptyFirstTab = allowEmptyFirstPickerSyncRef.current
      const mayOpenPicker = pickerAlreadyOpen || tabOpenRequested || emptyFirstTab
      const resolved = resolveImeTokenPicker(ln, pos, completionCandidatesRef.current, {
        emptyFirstPrefixShowsAll: mayOpenPicker,
        candidateMatch: incrementalPickerMatchMode(pickerAlreadyOpen)
      })
      allowEmptyFirstPickerSyncRef.current = false
      tabPickerOpenRequestRef.current = false
      if (!resolved) {
        setSubCmdPicker(null)
        return
      }
      if (!mayOpenPicker) {
        setSubCmdPicker(null)
        return
      }
      setSubCmdPicker((prev) => {
        const sameSlot =
          prev !== null &&
          prev.tokenStart === resolved.tokenStart &&
          prev.tokenEnd === resolved.tokenEnd &&
          prev.tier === resolved.tier &&
          prev.candidates.length === resolved.candidates.length &&
          prev.candidates.every((c, i) => c === resolved.candidates[i])
        const hi = sameSlot
          ? Math.min(prev!.hi, resolved.candidates.length - 1)
          : 0
        return {
          tokenStart: resolved.tokenStart,
          tokenEnd: resolved.tokenEnd,
          candidates: resolved.candidates,
          hi,
          tier: resolved.tier
        }
      })
    },
    [
      bridgeRef,
      completionCandidatesRef,
      imeTokenPickerDismissedRef,
      mode,
      navPageTyping,
      openSessionPicker,
      sessionListPickerDismissedRef,
      sessionListRowsRef,
      sessionNameTypingRef,
      allowEmptyFirstPickerSyncRef,
      tabPickerOpenRequestRef
    ]
  )

  const dismissToken = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    tabPickerOpenRequestRef.current = false
    imeTokenPickerDismissedRef.current = true
    setSubCmdPicker(null)
  }, [allowEmptyFirstPickerSyncRef, imeTokenPickerDismissedRef, tabPickerOpenRequestRef])

  const closeAll = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    tabPickerOpenRequestRef.current = false
    setSubCmdPicker(null)
    setSessionListPickerHi(null)
    setSessionPickerVariant(null)
  }, [allowEmptyFirstPickerSyncRef, tabPickerOpenRequestRef])

  const nudgeSubCmdPickerHi = useCallback((delta: number) => {
    setSubCmdPicker((s) => {
      if (!s || s.candidates.length === 0) {
        return s
      }
      const n = s.candidates.length
      return { ...s, hi: (s.hi + delta + n) % n }
    })
  }, [])

  const cycleSubCmdPickerHi = useCallback(() => {
    setSubCmdPicker((s) => {
      if (!s || s.candidates.length === 0) {
        return s
      }
      const n = s.candidates.length
      return { ...s, hi: (s.hi + 1) % n }
    })
  }, [])

  const clearSubCmdPicker = useCallback(() => {
    setSubCmdPicker(null)
  }, [])

  const getSessionListContext = useCallback((): SessionListPickerContext => {
    return {
      rows: sessionListPickerRowsRef.current,
      variant: sessionPickerVariantRef.current,
      hi: sessionListPickerHiRef.current
    }
  }, [])

  useEffect(() => {
    onPickerUiChange?.({
      subCmdPickerOpen: subCmdPicker !== null,
      sessionListPickerOpen
    })
  }, [onPickerUiChange, sessionListPickerOpen, subCmdPicker])

  useImperativeHandle(
    ref,
    () => ({
      sync,
      dismissToken,
      closeAll,
      getSubCmdPicker: () => subCmdPickerRef.current,
      isSessionListOpen: () => sessionListPickerHiRef.current !== null,
      getSessionListContext,
      setSessionListPickerHi,
      nudgeSubCmdPickerHi,
      cycleSubCmdPickerHi,
      clearSubCmdPicker
    }),
    [
      clearSubCmdPicker,
      closeAll,
      cycleSubCmdPickerHi,
      dismissToken,
      getSessionListContext,
      nudgeSubCmdPickerHi,
      sync
    ]
  )

  if (!promptPickerOpen) {
    return null
  }

  return (
    <div
      ref={hostRef}
      className="bmxt-subcmd-picker-host bmxt-subcmd-picker-host--positioned"
      {...{ [CSP_DYNAMIC_SCOPE_ATTR]: promptPickerScopeId ?? subCmdPickerScopeId }}>
      {subCmdPicker ? (
        <TokenPickerPanel model={subCmdPicker} />
      ) : sessionListPickerHi !== null ? (
        <SessionListCandidatePanel
          rows={sessionListPickerRows}
          hi={sessionListPickerHi}
          variant={sessionPickerVariant ?? "list"}
        />
      ) : null}
    </div>
  )
})
