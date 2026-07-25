import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../../command-line"
import { resolveActiveCommandSegment } from "../../command-line/compound/active-segment.ts"
import { isCompleteSecondTokenWithoutFurtherFixedTokens } from "../../command-line/second-token-picker.ts"
import {
  filterSessionSwitchPickerRows,
  resolveSessionSwitchPickerState,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../../session"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import type { TokenPickerModel } from "../token-picker-panel"
import { useCspDynamicStyle } from "../csp-dynamic-stylesheet"
import { shouldKeepSessionSwitchPickerOpen, measureFloatingPickerHostPosition } from "./bmxt-shell-prompt-helpers"
import {
  findNavReloadTabTokenSpans,
  listNavReloadTabCandidates,
  navReloadTabChipMetaFromCandidate,
  navReloadTabCompletionZone,
  type NavReloadTabChipMeta
} from "../../nav/nav-reload-tab-token"

export type UsePromptPickersOptions = {
  sessionId: string
  mode: "normal" | "isearch"
  line: string
  cursorPos: number
  isComposing: boolean
  localCompletion: readonly string[]
  sessionListRows: readonly SessionListRow[]
  navPageTyping: boolean
  paneFocusRef: React.MutableRefObject<PaneFocusTarget>
  sessionNameTypingRef: React.MutableRefObject<boolean>
  scrollRef: React.RefObject<HTMLDivElement | null>
  cursorMirrorCellRef: React.RefObject<HTMLSpanElement | null>
  subCmdPickerHostRef: React.RefObject<HTMLDivElement | null>
  navReloadTabMetaRef: React.MutableRefObject<Map<number, NavReloadTabChipMeta>>
  onNavReloadTabMetaUpdated: () => void
}

/** EN: IME / subcmd / session-list floating pickers on the prompt. */
export function usePromptPickers(options: UsePromptPickersOptions) {
  const completionCandidatesRef = useRef<string[]>([])
  useEffect(() => {
    completionCandidatesRef.current = [...options.localCompletion]
  }, [options.localCompletion])

  const allowEmptyFirstPickerSyncRef = useRef(false)
  const tabPickerOpenRequestRef = useRef(false)
  const imeTokenPickerDismissedRef = useRef(false)
  const sessionListPickerDismissedRef = useRef(false)

  const [subCmdPicker, setSubCmdPicker] = useState<TokenPickerModel | null>(null)
  const subCmdPickerRef = useRef<TokenPickerModel | null>(null)
  useEffect(() => {
    subCmdPickerRef.current = subCmdPicker
  }, [subCmdPicker])

  const [sessionListPickerHi, setSessionListPickerHi] = useState<number | null>(null)
  const sessionListPickerOpen = sessionListPickerHi !== null
  const sessionListPickerHiRef = useRef(sessionListPickerHi)
  sessionListPickerHiRef.current = sessionListPickerHi

  const [sessionPickerVariant, setSessionPickerVariant] = useState<SessionCandidatePanelVariant | null>(
    null
  )
  const sessionPickerVariantRef = useRef(sessionPickerVariant)
  sessionPickerVariantRef.current = sessionPickerVariant

  const sessionListRowsRef = useRef(options.sessionListRows)
  sessionListRowsRef.current = options.sessionListRows

  const sessionListPickerRows = useMemo((): SessionListRow[] => {
    if (sessionPickerVariant !== "switch" || sessionListPickerHi === null) {
      return [...options.sessionListRows]
    }
    const state = resolveSessionSwitchPickerState(options.line, options.cursorPos)
    const namePrefix = state?.namePrefix ?? ""
    return filterSessionSwitchPickerRows(
      options.sessionListRows,
      namePrefix,
      incrementalPickerMatchMode(true)
    )
  }, [
    options.sessionListRows,
    sessionPickerVariant,
    sessionListPickerHi,
    options.line,
    options.cursorPos
  ])
  const sessionListPickerRowsRef = useRef(sessionListPickerRows)
  sessionListPickerRowsRef.current = sessionListPickerRows

  const subCmdPickerScopeId = `subcmd-picker-${options.sessionId}`
  const sessionListPickerScopeId = `session-list-picker-${options.sessionId}`
  const promptPickerOpen = subCmdPicker !== null || sessionListPickerOpen
  const promptPickerScopeId = subCmdPicker
    ? subCmdPickerScopeId
    : sessionListPickerOpen
      ? sessionListPickerScopeId
      : null
  const [subCmdPickerPos, setSubCmdPickerPos] = useState<{ left: number; top: number } | null>(null)
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

  const dismissImeTokenPicker = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    tabPickerOpenRequestRef.current = false
    imeTokenPickerDismissedRef.current = true
    setSubCmdPicker(null)
  }, [])

  const navReloadPickGenRef = useRef(0)

  const closePromptPickerUi = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    tabPickerOpenRequestRef.current = false
    setSubCmdPicker(null)
    setSessionListPickerHi(null)
    setSessionPickerVariant(null)
  }, [])

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
  }, [])

  const syncImeTokenPicker = useCallback(
    (ln: string, pos: number) => {
      if (options.paneFocusRef.current !== "terminal") {
        return
      }
      if (options.sessionNameTypingRef.current) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        setSessionListPickerHi(null)
        return
      }
      if (options.navPageTyping) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        return
      }
      if (options.mode === "isearch") {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        setSessionListPickerHi(null)
        return
      }
      const active = resolveActiveCommandSegment(ln, pos)
      const segmentLine = ln.slice(active.segmentStart, active.segmentEnd)
      const segmentCursor = active.localCursor
      const switchState = resolveSessionSwitchPickerState(segmentLine, segmentCursor)
      if (switchState !== null) {
        const allRows = sessionListRowsRef.current
        const keepOpen = shouldKeepSessionSwitchPickerOpen(segmentLine, segmentCursor, allRows)
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
      sessionListPickerDismissedRef.current = false
      setSessionListPickerHi(null)
      setSessionPickerVariant(null)

      const reloadZone = navReloadTabCompletionZone(ln, pos)
      if (reloadZone !== null) {
        if (imeTokenPickerDismissedRef.current) {
          setSubCmdPicker(null)
          return
        }
        const gen = ++navReloadPickGenRef.current
        const selected = new Set(
          findNavReloadTabTokenSpans(ln).map((s) => s.tabId)
        )
        void listNavReloadTabCandidates(reloadZone.prefix).then((cands) => {
          if (gen !== navReloadPickGenRef.current) {
            return
          }
          const filtered = cands.filter((c) => !selected.has(c.tabId))
          if (filtered.length === 0) {
            setSubCmdPicker(null)
            return
          }
          for (const c of filtered) {
            options.navReloadTabMetaRef.current.set(
              c.tabId,
              navReloadTabChipMetaFromCandidate(c)
            )
          }
          options.onNavReloadTabMetaUpdated()
          setSubCmdPicker((prev) => {
            const candidates = filtered.map((c) => c.insertToken)
            const candidateLabels = filtered.map((c) => c.label)
            const candidateRows = filtered.map((c) => ({
              title: c.title,
              faviconSrc: c.faviconSrc
            }))
            const sameSlot =
              prev !== null &&
              prev.tokenStart === reloadZone.tokenStart &&
              prev.tokenEnd === reloadZone.tokenEnd &&
              prev.tier === "third" &&
              prev.candidates.length === candidates.length &&
              prev.candidates.every((c, i) => c === candidates[i])
            if (sameSlot && prev) {
              return {
                ...prev,
                candidateLabels,
                candidateRows,
                hi: Math.min(prev.hi, candidates.length - 1)
              }
            }
            return {
              tokenStart: reloadZone.tokenStart,
              tokenEnd: reloadZone.tokenEnd,
              candidates,
              candidateLabels,
              candidateRows,
              hi: 0,
              tier: "third"
            }
          })
        })
        return
      }

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
        // EN: Complete second with no further fixed tokens (e.g. `tab -nowurl`) — close.
        // Do not leave a hollow “第二コマンド” popup that steals Enter.
        if (isCompleteSecondTokenWithoutFurtherFixedTokens(ln, pos)) {
          setSubCmdPicker(null)
          allowEmptyFirstPickerSyncRef.current = false
          tabPickerOpenRequestRef.current = false
          return
        }
        // EN: Keep an already-open menu alive through empty filter steps so further
        // keystrokes can re-narrow without requiring Tab again.
        if (mayOpenPicker && pickerAlreadyOpen) {
          setSubCmdPicker((prev) => {
            if (!prev) {
              return null
            }
            return {
              ...prev,
              candidates: [],
              candidateLabels: undefined,
              candidateRows: undefined,
              hi: 0
            }
          })
          return
        }
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
    [openSessionPicker, options.mode, options.navPageTyping, options.navReloadTabMetaRef, options.onNavReloadTabMetaUpdated, options.paneFocusRef, options.sessionNameTypingRef]
  )

  useEffect(() => {
    if (options.isComposing || options.navPageTyping) {
      return
    }
    syncImeTokenPicker(options.line, options.cursorPos)
  }, [
    options.line,
    options.cursorPos,
    options.isComposing,
    options.navPageTyping,
    syncImeTokenPicker,
    options.localCompletion
  ])

  useLayoutEffect(() => {
    if (!promptPickerOpen) {
      setSubCmdPickerPos(null)
      return
    }
    const measure = () => {
      const next = measureFloatingPickerHostPosition(
        options.cursorMirrorCellRef.current,
        options.subCmdPickerHostRef.current
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
    const sc = options.scrollRef.current
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
    options.line,
    options.cursorPos,
    options.mode,
    promptPickerOpen,
    options.scrollRef,
    options.cursorMirrorCellRef,
    options.subCmdPickerHostRef
  ])

  const closeSessionListPicker = useCallback(() => {
    sessionListPickerDismissedRef.current = true
    setSessionListPickerHi(null)
    setSessionPickerVariant(null)
  }, [])

  return {
    subCmdPicker,
    setSubCmdPicker,
    subCmdPickerRef,
    sessionListPickerHi,
    setSessionListPickerHi,
    sessionListPickerHiRef,
    sessionListPickerOpen,
    sessionListPickerRows,
    sessionListPickerRowsRef,
    sessionListRowsRef,
    sessionPickerVariant,
    setSessionPickerVariant,
    sessionPickerVariantRef,
    sessionListPickerDismissedRef,
    allowEmptyFirstPickerSyncRef,
    tabPickerOpenRequestRef,
    imeTokenPickerDismissedRef,
    dismissImeTokenPicker,
    closePromptPickerUi,
    openSessionPicker,
    syncImeTokenPicker,
    promptPickerOpen,
    promptPickerScopeId,
    subCmdPickerScopeId,
    sessionListPickerScopeId
  }
}
