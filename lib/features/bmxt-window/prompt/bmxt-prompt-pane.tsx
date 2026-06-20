import { flushSync } from "react-dom"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from "react"
import {
  buildSessionSwitchCommandLine,
  filterSessionSwitchPickerRows,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  resolveSessionSwitchPickerState,
  sanitizeSessionName,
  SessionListCandidatePanel,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../../session"
import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../../command-line"
import {
  buildTabPickerRows,
  listTabsMoveUrlCandidates,
  openTabPickerEngineForSession,
  closeTabPickerEngineForSession,
  parseGroupNewInteractiveLine,
  parseTabsExitListLine,
  parseTabsListPickerLine,
  parseTabsSettingCommandLine,
  resolveInitialTabPickerHighlightIndex,
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode,
  TABS_PAGE_ACTIVE_MODE_TOKENS,
  tabsMoveUrlCompletionZone
} from "../../tabs"
import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchExitListLine,
  parseSearchListPickerLine,
  shouldShowSearchListPatternPlaceholder
} from "../../search/search-list-picker-input"
import {
  parseDomExitListLine,
  parseDomListPickerLine
} from "../../dom/dom-list-picker-input"
import {
  createSettingListPickerState,
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine,
  translateOnLogLine,
  type useUiCopy
} from "../../setting"
import { canScriptHttpHostPages } from "../../extension-permissions/optional-http-hosts"
import { parseNavEnterLine, parseNavExitLine } from "../../nav"
import {
  NAV_ENTER_TYPING_EVENT,
  NAV_EXIT_TYPING_EVENT,
  type NavEnterTypingDetail
} from "../../nav"
import {
  navTypingInsert,
  navTypingShouldPreventLineBreakInput,
  normalizeNavTypingInitialValue,
  promptMirrorSegments,
  sanitizeNavTypingDomValueWithCursor,
  sanitizeNavTypingInsertText
} from "../../nav/nav-prompt-input"
import {
  buildEnglishCommitText,
  listTranslationPairSettingTokens,
  parseTranslateCommandLine,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId,
  TranslationStrip,
  useSentenceTranslate,
  type TranslationPairId
} from "../../translate"
import { buildHelpLines } from "../../bmxt-core/registry/help"
import {
  activateModeToolbar,
  deactivateModeToolbar
} from "../mode-toolbar-order"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates,
  runDispatch
} from "../../bmxt-core"
import { logBmxtKey } from "../../debug/key-log"
import { matchesForSearch } from "../text-utils"
import { TokenPickerPanel, type TokenPickerModel } from "../token-picker-panel"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../csp-dynamic-stylesheet"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import { measureFloatingPickerHostPosition } from "./measure-floating-picker-host"
import { shouldAutoSubmitAfterTokenPick } from "./should-auto-submit-after-token-pick"
import { shouldKeepSessionSwitchPickerOpen } from "./should-keep-session-switch-picker-open"
import type { PromptShellBridge } from "./prompt-shell-bridge"
import type { BmxtPromptHandle } from "./bmxt-prompt-handle"

export type BmxtPromptPaneProps = {
  bridgeRef: RefObject<PromptShellBridge>
  history: string[]
  completionCandidates: string[]
  sessionListRows: SessionListRow[]
  sessionId: string
  promptPaneFocused: boolean
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  navPageTyping: boolean
  navTypingMultiline: boolean
  navKeyboardEnabled: boolean
  navTypingMode: boolean
  navMenuOpen: boolean
  navTextSelPicking: boolean
  navTextSelDone: boolean
  navArmed: boolean
  handleToggleNavActive: () => void
  translateEnabled: boolean
  translatePairId: TranslationPairId
  scrollRef: RefObject<HTMLDivElement | null>
  uiCopy: ReturnType<typeof useUiCopy>
}

export const BmxtPromptPane = forwardRef<BmxtPromptHandle, BmxtPromptPaneProps>(
  function BmxtPromptPane(props, ref) {
    const {
      bridgeRef,
      history,
      completionCandidates,
      sessionListRows,
      sessionId,
      promptPaneFocused,
      isFocusedPane,
      paneFocus,
      navPageTyping,
      navTypingMultiline,
      navKeyboardEnabled,
      navTypingMode,
      navMenuOpen,
      navTextSelPicking,
      navTextSelDone,
      navArmed,
      handleToggleNavActive,
      translateEnabled,
      translatePairId,
      scrollRef,
      uiCopy
    } = props

    const translateEnabledRef = useRef(translateEnabled)
    const translatePairIdRef = useRef(translatePairId)
    useEffect(() => {
      translateEnabledRef.current = translateEnabled
    }, [translateEnabled])
    useEffect(() => {
      translatePairIdRef.current = translatePairId
    }, [translatePairId])

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
  const sessionListRowsRef = useRef(sessionListRows)
  sessionListRowsRef.current = sessionListRows
  const currentSessionDisplayNameRef = useRef("")
  currentSessionDisplayNameRef.current = bridgeRef.current?.currentSessionDisplayName ?? ""

  const [sessionNameTyping, setSessionNameTyping] = useState(false)
  const sessionNameTypingRef = useRef(sessionNameTyping)
  sessionNameTypingRef.current = sessionNameTyping

  const [mode, setMode] = useState<"normal" | "isearch">("normal")
  const [line, setLine] = useState("")
  const [cursorPos, setCursorPos] = useState(0)
  const sessionListPickerRows = useMemo((): SessionListRow[] => {
    if (sessionPickerVariant !== "switch" || sessionListPickerHi === null) {
      return sessionListRows
    }
    const state = resolveSessionSwitchPickerState(line, cursorPos)
    const namePrefix = state?.namePrefix ?? ""
    return filterSessionSwitchPickerRows(
      sessionListRows,
      namePrefix,
      incrementalPickerMatchMode(true)
    )
  }, [sessionListRows, sessionPickerVariant, sessionListPickerHi, line, cursorPos])
  const sessionListPickerRowsRef = useRef(sessionListPickerRows)
  sessionListPickerRowsRef.current = sessionListPickerRows
  const [isComposing, setIsComposing] = useState(false)
  const [compositionAnchor, setCompositionAnchor] = useState(0)
  const [localCompletion, setLocalCompletion] = useState<string[]>(completionCandidates)

  const {
    blocks: navTranslateBlocks,
    busy: navTranslateBusy,
    translatePending: navTranslatePending,
    statusNote: navTranslateStatus,
    resetSession: resetNavTranslateSession,
    flushPendingTranslations: flushNavTranslatePending,
    setCommitError: setNavTranslateCommitError
  } = useSentenceTranslate({
    active: navPageTyping && translateEnabled,
    buffer: line,
    isComposing,
    pairId: translatePairId
  })

  const navTranslateBlocksRef = useRef<readonly import("../../translate").TranslationBlock[]>([])
  useEffect(() => {
    navTranslateBlocksRef.current = navTranslateBlocks
  }, [navTranslateBlocks])

  useEffect(() => {
    setLocalCompletion(completionCandidates)
  }, [completionCandidates])

  useEffect(() => {
    completionCandidatesRef.current = localCompletion
  }, [localCompletion])

  useEffect(() => {
    lineRef.current = line
  }, [line])

  useEffect(() => {
    cursorRef.current = cursorPos
  }, [cursorPos])
  useEffect(() => {
    void (async () => {
      try {
        await ensureBmxtCore()
        setLocalCompletion(getCompletionCandidates())
      } catch {
        setLocalCompletion(FALLBACK_COMPLETION_CANDIDATES)
      }
    })()
  }, [])
  const iSearchMatches = useMemo(
    () => matchesForSearch(history, mode === "isearch" ? line : ""),
    [history, line, mode]
  )

  /** `hi` 変更では変わらない — 第二コマンドピッカーの位置再計算はこれが変わったときだけ行う */
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

  const closePromptPickerUi = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    tabPickerOpenRequestRef.current = false
    setSubCmdPicker(null)
    setSessionListPickerHi(null)
    setSessionPickerVariant(null)
  }, [])

  const openSessionPicker = useCallback(
    (variant: SessionCandidatePanelVariant) => {
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
    },
    []
  )

  const syncImeTokenPicker = useCallback(
    (ln: string, pos: number) => {
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
    [mode, navPageTyping, openSessionPicker]
  )
  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)

  const focusPrompt = useCallback(() => {
    imeRef.current?.focus()
  }, [])

  const restoreNavPromptSnap = useCallback(() => {
    const snap = navPromptSnapRef.current
    if (!snap) {
      return
    }
    const ta = imeRef.current
    if (ta) {
      ta.value = snap.line
      ta.selectionStart = snap.cursor
      ta.selectionEnd = snap.cursor
    }
    lineRef.current = snap.line
    setLine(snap.line)
    setCursorPos(snap.cursor)
  }, [])

  const [subCmdPickerPos, setSubCmdPickerPos] = useState<{ left: number; top: number } | null>(
    null
  )
  const subCmdPickerScopeId = `subcmd-picker-${sessionId}`
  const sessionListPickerScopeId = `session-list-picker-${sessionId}`
  const promptPickerOpen = subCmdPicker !== null || sessionListPickerOpen
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
  const [histNavIndex, setHistNavIndex] = useState(-1)
  const [histDraft, setHistDraft] = useState("")
  const skipHistResetRef = useRef(false)

  const [iSearchCycle, setISearchCycle] = useState(0)
  const [iSearchSnapshot, setISearchSnapshot] = useState("")

  const tabPressSeqRef = useRef(0)
  const lineRef = useRef("")
  const cursorRef = useRef(0)
  const navPromptSnapRef = useRef<{ line: string; cursor: number } | null>(null)
  const completionCandidatesRef = useRef<string[]>([])
  /** EN: Tab on empty line opened the first-command menu — keep showing until input/Esc/submit. */
  const allowEmptyFirstPickerSyncRef = useRef(false)
  /** EN: Tab on the prompt requested the token menu — open/update once per Tab press. */
  const tabPickerOpenRequestRef = useRef(false)
  /** EN: Esc closed the token menu — suppress until Tab; not history ↑↓. */
  const imeTokenPickerDismissedRef = useRef(false)
  /** EN: Esc closed the session-list menu while `session -list` stays on the prompt. */
  const sessionListPickerDismissedRef = useRef(false)
  useLayoutEffect(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [line, cursorPos, isComposing])

  useLayoutEffect(() => {
    if (!promptPickerOpen) {
      setSubCmdPickerPos(null)
      return
    }
    const measure = () => {
      const next = measureFloatingPickerHostPosition(
        cursorMirrorCellRef.current,
        subCmdPickerHostRef.current
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
  }, [subCmdPickerAnchorEpisode, sessionListMenuAnchorEpisode, line, cursorPos, mode, promptPickerOpen])
  const closeSessionNameTyping = useCallback(() => {
    setSessionNameTyping(false)
    setLine("")
    setCursorPos(0)
    lineRef.current = ""
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [focusPrompt])

  const openSessionNameTyping = useCallback(
    (commandLine: string) => {
      setSubCmdPicker(null)
      setSessionListPickerHi(null)
      setSessionPickerVariant(null)
      sessionListPickerDismissedRef.current = false
      bridgeRef.current.appendCommandToHistory(commandLine)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const name = currentSessionDisplayNameRef.current
      setSessionNameTyping(true)
      setLine(name)
      setCursorPos(name.length)
      lineRef.current = name
      void bridgeRef.current.appendLogLines([`> ${commandLine}`])
      queueMicrotask(() => {
        const ta = imeRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(0, name.length)
        }
      })
    },
    [bridgeRef.current.appendCommandToHistory, bridgeRef.current.appendLogLines]
  )

  const saveSessionDisplayName = useCallback(
    (rawName: string, logLines: string[]) => {
      const sanitized = sanitizeSessionName(rawName)
      setSessionNameTyping(false)
      setLine("")
      setCursorPos(0)
      lineRef.current = ""
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const out = [...logLines]
        if (!sanitized) {
          out.push(uiCopy.t("session.settingName.invalid"))
          await bridgeRef.current.appendLogLines(out)
          focusPrompt()
          return
        }
        await bridgeRef.current.onSetSessionDisplayName(sessionId, sanitized)
        out.push(uiCopy.t("session.settingName.saved", { name: sanitized }))
        await bridgeRef.current.appendLogLines(out)
        focusPrompt()
      })()
    },
    [bridgeRef.current.appendLogLines, focusPrompt, bridgeRef.current.onSetSessionDisplayName, sessionId, uiCopy]
  )

  const closeSessionListPicker = useCallback(() => {
    sessionListPickerDismissedRef.current = true
    setSessionListPickerHi(null)
    setSessionPickerVariant(null)
    focusPrompt()
  }, [focusPrompt])

  const switchSessionFromListPicker = useCallback(
    (commandLine: string, pickHi: number) => {
      const rows = sessionListPickerRowsRef.current
      const row = rows[pickHi]
      const variant = sessionPickerVariantRef.current
      sessionListPickerDismissedRef.current = false
      setSessionListPickerHi(null)
      setSessionPickerVariant(null)
      bridgeRef.current.appendCommandToHistory(commandLine)
      setLine("")
      setCursorPos(0)
      lineRef.current = ""
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${commandLine}`]
        if (!row) {
          logLines.push(
            uiCopy.t("session.number.invalid", {
              n: String(pickHi + 1),
              max: String(rows.length)
            })
          )
        } else {
          logLines.push(
            variant === "switch"
              ? uiCopy.t("session.switch.switched", { name: row.displayName })
              : uiCopy.t("session.number.switched", { n: String(row.index) })
          )
          await bridgeRef.current.onActivateSession(row.sessionId)
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
    },
    [bridgeRef.current.appendCommandToHistory, bridgeRef.current.appendLogLines, focusPrompt, bridgeRef.current.onActivateSession, uiCopy]
  )

  const applySessionSwitchPick = useCallback(
    (pickHi: number) => {
      const visibleRows = sessionListPickerRowsRef.current
      const allRows = sessionListRowsRef.current
      const row = visibleRows[pickHi]
      if (!row) {
        return
      }
      sessionListPickerDismissedRef.current = true
      setSessionListPickerHi(null)
      setSessionPickerVariant(null)
      const nextLine = buildSessionSwitchCommandLine(row, allRows)
      lineRef.current = nextLine
      setLine(nextLine)
      setCursorPos(nextLine.length)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      focusPrompt()
    },
    [focusPrompt]
  )

  useEffect(() => {
    const onEnter = (ev: Event) => {
      const detail = (ev as CustomEvent<NavEnterTypingDetail>).detail
      if (!detail) {
        return
      }
      const ta = imeRef.current
      navPromptSnapRef.current = {
        line: ta?.value ?? lineRef.current,
        cursor: ta?.selectionStart ?? cursorRef.current
      }
      skipHistResetRef.current = true
      tabPressSeqRef.current = 0
      setHistNavIndex(-1)
      setSubCmdPicker(null)
      allowEmptyFirstPickerSyncRef.current = false
      imeTokenPickerDismissedRef.current = false
      isComposingRef.current = false
      compositionStartSnapshotRef.current = ""
      const initial = normalizeNavTypingInitialValue(
        detail.initialValue,
        detail.multiline
      )
      const applyEnter = () => {
        setCompositionAnchor(0)
        setIsComposing(false)
        lineRef.current = initial
        setLine(initial)
        setCursorPos(initial.length)
      }
      flushSync(applyEnter)
      if (ta) {
        ta.value = initial
        ta.setSelectionRange(initial.length, initial.length)
      }
      focusPrompt()
    }
    const onExit = () => {
      isComposingRef.current = false
      compositionStartSnapshotRef.current = ""
      setCompositionAnchor(0)
      setIsComposing(false)
      restoreNavPromptSnap()
      navPromptSnapRef.current = null
      resetNavTranslateSession()
    }
    window.addEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
    window.addEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    return () => {
      window.removeEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
      window.removeEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    }
  }, [focusPrompt, restoreNavPromptSnap, resetNavTranslateSession])

  const promptLine = useCallback(
    () => imeRef.current?.value ?? lineRef.current,
    []
  )

  const submitLine = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = false
    if (mode === "isearch") {
      const pick = iSearchMatches[iSearchCycle]
      const next = pick !== undefined ? pick : iSearchSnapshot
      setMode("normal")
      setLine(next)
      setCursorPos(next.length)
      setISearchCycle(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      focusPrompt()
      return
    }
    const rawLine = promptLine()
    const trimmed = rawLine.trim()
    if (!trimmed) {
      return
    }

    if (parseSettingIncompleteLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const cont = "setting "
      setLine(cont)
      setCursorPos(cont.length)
      lineRef.current = cont
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("setting.usage")])
      focusPrompt()
      return
    }

    if (parseSettingListPickerLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        await bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("setting.picker.hint")])
        bridgeRef.current.setSettingListPicker(sessionId, createSettingListPickerState(bridgeRef.current.uiSettings))
        bridgeRef.current.setModeToolbarOrder((prev) => activateModeToolbar(prev, "setting"))
      })()
      return
    }

    if (parseSettingExitListLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (bridgeRef.current.getSettingListPicker() !== null) {
          bridgeRef.current.closeSettingPickerColumn()
          logLines.push(uiCopy.t("setting.picker.closed"))
        } else {
          logLines.push(uiCopy.t("setting.picker.notOpen"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    const tabsSettingCmd = parseTabsSettingCommandLine(trimmed)
    if (tabsSettingCmd !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      if (tabsSettingCmd.kind === "incomplete") {
        const cont = "tabs "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        void bridgeRef.current.appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("tabs.usage"),
          uiCopy.t("tabs.settingHint")
        ])
        focusPrompt()
        return
      }
      if (tabsSettingCmd.kind === "setting-incomplete") {
        const cont = "tabs -setting "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        void bridgeRef.current.appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("tabs.setting.choose"),
          uiCopy.t("tabs.setting.pageActiveCurrent", {
            token: settingTokenForPageActiveMode(bridgeRef.current.tabsPageActiveModeRef.current)
          })
        ])
        focusPrompt()
        return
      }
      if (tabsSettingCmd.kind === "page-active-incomplete") {
        const cont = "tabs -setting -page-active "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        const options = TABS_PAGE_ACTIVE_MODE_TOKENS.join(" | ")
        void bridgeRef.current.appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("tabs.pageActive.choose", { options }),
          uiCopy.t("setting.language.current", {
            token: settingTokenForPageActiveMode(bridgeRef.current.tabsPageActiveModeRef.current)
          })
        ])
        focusPrompt()
        return
      }
      setLine("")
      setCursorPos(0)
      lineRef.current = ""
      void (async () => {
        await saveTabsPageActiveMode(tabsSettingCmd.mode)
        bridgeRef.current.setTabsPageActiveMode(tabsSettingCmd.mode)
        const token = settingTokenForPageActiveMode(tabsSettingCmd.mode)
        await bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("tabs.pageActive.set", { token })])
        focusPrompt()
      })()
      return
    }

    if (sessionNameTypingRef.current) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      saveSessionDisplayName(trimmed, [])
      return
    }

    if (parseSessionSettingNameBareLine(trimmed)) {
      openSessionNameTyping(trimmed)
      return
    }

    const sessionSettingName = parseSessionSettingNameWithLine(trimmed)
    if (sessionSettingName !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      saveSessionDisplayName(sessionSettingName, [`> ${trimmed}`])
      return
    }

    if (parseSessionListPickerLine(trimmed)) {
      const activeIdx = sessionListRows.findIndex((r) => r.isActive)
      const pickHi = sessionListPickerHiRef.current ?? (activeIdx >= 0 ? activeIdx : 0)
      switchSessionFromListPicker(trimmed, pickHi)
      return
    }

    const sessionSwitchName = parseSessionSwitchWithLine(trimmed)
    if (sessionSwitchName !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const row = resolveSessionRowByDisplayName(sessionListRows, sessionSwitchName)
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (!row) {
          logLines.push(uiCopy.t("session.switch.notFound", { name: sessionSwitchName }))
        } else {
          logLines.push(uiCopy.t("session.switch.switched", { name: row.displayName }))
          await bridgeRef.current.onActivateSession(row.sessionId)
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseSessionSwitchPickerLine(trimmed)) {
      sessionListPickerDismissedRef.current = false
      syncImeTokenPicker(lineRef.current, lineRef.current.length)
      focusPrompt()
      return
    }

    const sessionNumber = parseSessionSwitchByNumberLine(trimmed)
    if (sessionNumber !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const row = sessionListRows[sessionNumber - 1]
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (!row) {
          logLines.push(
            uiCopy.t("session.number.invalid", {
              n: String(sessionNumber),
              max: String(sessionListRows.length)
            })
          )
          await bridgeRef.current.appendLogLines(logLines)
          focusPrompt()
          return
        }
        logLines.push(uiCopy.t("session.number.switched", { n: String(sessionNumber) }))
        await bridgeRef.current.appendLogLines(logLines)
        await bridgeRef.current.onActivateSession(row.sessionId)
        focusPrompt()
      })()
      return
    }

    const listPicker = parseTabsListPickerLine(trimmed)
    if (listPicker) {
      const { showUrl } = listPicker
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(showUrl, bridgeRef.current.uiSettings.locale)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          const pageActiveToken = settingTokenForPageActiveMode(bridgeRef.current.tabsPageActiveModeRef.current)
          await bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("tabs.picker.hint", { token: pageActiveToken })
          ])
          bridgeRef.current.setTabPicker(sessionId, openTabPickerEngineForSession(sessionId, { rows, showUrl, initialHi }))
          bridgeRef.current.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
      })()
      return
    }

    if (parseTabsExitListLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (bridgeRef.current.getTabPicker() !== null) {
          closeTabPickerEngineForSession(sessionId)
          bridgeRef.current.setTabPicker(sessionId, null)
          bridgeRef.current.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
          bridgeRef.current.activatePaneFocus("terminal")
          logLines.push(uiCopy.t("tabs.picker.closed"))
        } else {
          logLines.push(uiCopy.t("tabs.picker.notOpen"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseSearchExitListLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const hadActiveJob = bridgeRef.current.isSearchListJobActive()
        if (hadActiveJob) {
          bridgeRef.current.cancelSearchListJob()
        }
        bridgeRef.current.clearSearchLoadingProgress()
        if (bridgeRef.current.getSearchListPicker() !== null) {
          bridgeRef.current.setSearchListPicker(sessionId, null)
          bridgeRef.current.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
          bridgeRef.current.activatePaneFocus("terminal")
          logLines.push(uiCopy.t("search.picker.closed"))
        } else if (hadActiveJob) {
          logLines.push(uiCopy.t("search.picker.cancelled"))
        } else {
          logLines.push(uiCopy.t("search.picker.notOpen"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseNavEnterLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      bridgeRef.current.setNavArmed(true)
      bridgeRef.current.setNavActive(false)
      bridgeRef.current.setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
      void (async () => {
        const canPage = await canScriptHttpHostPages()
        const logLines = [`> ${trimmed}`, uiCopy.t("nav.armedLog")]
        if (!canPage) {
          logLines.push(uiCopy.t("nav.hostAccessWarning"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    const translateCmd = parseTranslateCommandLine(trimmed)
    if (translateCmd !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      if (translateCmd.kind === "incomplete") {
        const cont = "translate "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        void bridgeRef.current.appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("translate.usage"),
          uiCopy.t("translate.usageHint")
        ])
        focusPrompt()
        return
      }
      if (translateCmd.kind === "setting-incomplete") {
        const cont = "translate -setting "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        const options = listTranslationPairSettingTokens().join(" | ")
        void bridgeRef.current.appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("translate.setting.choose", { options }),
          uiCopy.t("setting.language.current", {
            token: settingTokenForPairId(bridgeRef.current.translatePairIdRef.current)
          })
        ])
        focusPrompt()
        return
      }
      setLine("")
      setCursorPos(0)
      lineRef.current = ""
      void (async () => {
        if (translateCmd.kind === "on") {
          await saveTranslateEnabled(true)
          bridgeRef.current.setTranslateEnabled(true)
          bridgeRef.current.setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
          await bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            translateOnLogLine(
              bridgeRef.current.uiSettings.locale,
              settingTokenForPairId(bridgeRef.current.translatePairIdRef.current)
            )
          ])
          focusPrompt()
        } else if (translateCmd.kind === "off") {
          await saveTranslateEnabled(false)
          bridgeRef.current.setTranslateEnabled(false)
          bridgeRef.current.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
          await bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("translate.off")])
          bridgeRef.current.activatePaneFocus("terminal")
        } else if (translateCmd.kind === "setting") {
          await saveTranslatePair(translateCmd.pair)
          bridgeRef.current.setTranslatePairId(translateCmd.pair)
          resetNavTranslateSession()
          const token = settingTokenForPairId(translateCmd.pair)
          await bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("translate.pairSet", { token })])
        }
      })()
      return
    }

    if (parseNavExitLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (bridgeRef.current.getNavActive()) {
          logLines.push(uiCopy.t("nav.exitActiveError"))
        } else if (!bridgeRef.current.getNavArmed()) {
          logLines.push(uiCopy.t("nav.notArmed"))
        } else {
          await bridgeRef.current.teardownNav()
          bridgeRef.current.clearNavPositions()
          bridgeRef.current.setNavArmed(false)
          bridgeRef.current.setNavActive(false)
          bridgeRef.current.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
          logLines.push(uiCopy.t("nav.disarmed"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseDomExitListLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const hadActiveDomJob = bridgeRef.current.isDomListJobActive()
        if (hadActiveDomJob) {
          bridgeRef.current.cancelDomListJob()
        }
        if (bridgeRef.current.getDomListPicker() !== null) {
          bridgeRef.current.setDomListPicker(sessionId, null)
          bridgeRef.current.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
          bridgeRef.current.activatePaneFocus("terminal")
          logLines.push(uiCopy.t("dom.picker.closed"))
        } else {
          logLines.push(uiCopy.t("dom.picker.notOpen"))
        }
        await bridgeRef.current.appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseGroupNewInteractiveLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(false, bridgeRef.current.uiSettings.locale)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          await bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("group.newPicker")])
          bridgeRef.current.setTabPicker(
            sessionId,
            openTabPickerEngineForSession(sessionId, {
              rows,
              showUrl: false,
              initialHi,
              variant: "groupNew"
            })
          )
          bridgeRef.current.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
      })()
      return
    }

    const searchListLine = parseSearchListPickerLine(trimmed)
    if (searchListLine !== null) {
      if (isSearchListContinuationPrompt(rawLine)) {
        bridgeRef.current.appendCommandToHistory(trimmed)
        const next = `${trimmed} `
        lineRef.current = next
        setLine(next)
        setCursorPos(next.length)
        setHistNavIndex(-1)
        tabPressSeqRef.current = 0
        setSubCmdPicker(null)
        focusPrompt()
        return
      }
      if (!isSearchListReadyToRun(trimmed, rawLine)) {
        focusPrompt()
        return
      }
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void bridgeRef.current.runSearchListSearch(trimmed, searchListLine)
      return
    }

    if (trimmed === "help" || trimmed === "?") {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, ...buildHelpLines(bridgeRef.current.uiSettings.locale)])
      focusPrompt()
      return
    }

    const domListLine = parseDomListPickerLine(trimmed)
    if (domListLine !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void bridgeRef.current.runDomListAndShow(domListLine, trimmed, /*announce*/ true)
      return
    }

    bridgeRef.current.appendCommandToHistory(trimmed)
    const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
    setLine("")
    setCursorPos(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0

    const localBundle = runDispatch(trimmed, bridgeRef.current.uiSettings.locale)
    if (localBundle.ty === "lines") {
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, ...(localBundle.lines ?? [])])
      if (continuationPrompt) {
        setSubCmdPicker(null)
        setLine(continuationPrompt)
        setCursorPos(continuationPrompt.length)
        lineRef.current = continuationPrompt
      }
      focusPrompt()
      return
    }

    chrome.runtime.sendMessage(
      { type: "RUN_CMD", line: trimmed, sessionId },
      (response) => {
        const err = chrome.runtime.lastError
        if (err) {
          void bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("error.dispatchFailed", { message: err.message })
          ])
          return
        }
        if (response && typeof response === "object" && "ok" in response && response.ok === false) {
          const msg =
            "error" in response && typeof response.error === "string"
              ? response.error
              : "unknown error"
          void bridgeRef.current.appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("error.generic", { message: msg })
          ])
        }
      }
    )
    if (continuationPrompt) {
      setSubCmdPicker(null)
      setLine(continuationPrompt)
      setCursorPos(continuationPrompt.length)
      lineRef.current = continuationPrompt
    }
    focusPrompt()
  }, [
    bridgeRef,
    focusPrompt,
    iSearchCycle,
    iSearchMatches,
    iSearchSnapshot,
    mode,
    promptLine,
    sessionId,
    sessionListRows,
    uiCopy,
    syncImeTokenPicker,
    openSessionNameTyping,
    saveSessionDisplayName,
    applySessionSwitchPick,
    switchSessionFromListPicker
  ])

  const applyTokenPickIndex = useCallback(
    (idx: number) => {
      allowEmptyFirstPickerSyncRef.current = false
      imeTokenPickerDismissedRef.current = false
      const s = subCmdPickerRef.current
      if (!s) {
        return
      }
      const tok = s.candidates[idx]
      if (!tok) {
        return
      }
      const cur = lineRef.current
      const appendAtEnd = s.tokenStart === s.tokenEnd && s.tokenStart >= cur.length
      let nextLine: string
      let nextPos: number
      if (appendAtEnd) {
        const sep = cur.length > 0 && !/\s$/.test(cur) ? " " : ""
        nextLine = `${cur}${sep}${tok} `
        nextPos = nextLine.length
      } else {
        const addTrailing = s.tokenEnd >= cur.length
        nextLine = addTrailing
          ? cur.slice(0, s.tokenStart) + tok + " " + cur.slice(s.tokenEnd)
          : cur.slice(0, s.tokenStart) + tok + cur.slice(s.tokenEnd)
        nextPos = s.tokenStart + tok.length + (addTrailing ? 1 : 0)
      }
      lineRef.current = nextLine
      setLine(nextLine)
      setCursorPos(nextPos)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const trimmedNext = nextLine.trim()
      if (shouldAutoSubmitAfterTokenPick(trimmedNext)) {
        setSubCmdPicker(null)
        queueMicrotask(() => submitLine())
        return
      }
      queueMicrotask(() => syncImeTokenPicker(nextLine, nextPos))
      focusPrompt()
    },
    [focusPrompt, submitLine, syncImeTokenPicker]
  )

  const exitISearch = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = false
    setMode("normal")
    setLine(iSearchSnapshot)
    setCursorPos(iSearchSnapshot.length)
    setISearchCycle(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [focusPrompt, iSearchSnapshot])

  const enterISearch = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = false
    setISearchSnapshot(lineRef.current)
    setMode("isearch")
    setLine("")
    setCursorPos(0)
    setISearchCycle(0)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [focusPrompt])

  const applyHistoryLine = useCallback((text: string) => {
    allowEmptyFirstPickerSyncRef.current = false
    skipHistResetRef.current = true
    tabPressSeqRef.current = 0
    setLine(text)
    setCursorPos(text.length)
  }, [])

  const applyPromptLine = useCallback(
    (
      nextLine: string,
      nextCursor: number,
      ta?: HTMLTextAreaElement | null,
      opts?: { preserveSelection?: boolean }
    ) => {
      lineRef.current = nextLine
      setLine(nextLine)
      setCursorPos(nextCursor)
      syncImeTokenPicker(nextLine, nextCursor)
      if (ta && !opts?.preserveSelection) {
        queueMicrotask(() => {
          ta.setSelectionRange(nextCursor, nextCursor)
        })
      }
    },
    [syncImeTokenPicker]
  )

  const syncPromptFromTextarea = useCallback(
    (ta: HTMLTextAreaElement, opts?: { composing?: boolean; newlineSnapshot?: string }) => {
      let v = ta.value
      let pos = ta.selectionEnd
      if (navPageTyping) {
        const snapshot =
          opts?.newlineSnapshot ??
          (opts?.composing ? compositionStartSnapshotRef.current : lineRef.current)
        const sanitized = sanitizeNavTypingDomValueWithCursor(
          v,
          pos,
          navTypingMultiline,
          snapshot
        )
        v = sanitized.value
        pos = sanitized.cursor
        if (v !== ta.value) {
          ta.value = v
          if (!opts?.composing) {
            ta.setSelectionRange(pos, pos)
          }
        }
      }
      applyPromptLine(v, pos, ta, { preserveSelection: opts?.composing })
    },
    [applyPromptLine, navPageTyping, navTypingMultiline]
  )

  const syncPromptFromTextareaForComposition = useCallback(
    (ta: HTMLTextAreaElement, opts: { composing: boolean; newlineSnapshot?: string }) => {
      const run = () => {
        syncPromptFromTextarea(ta, opts)
      }
      if (navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [navPageTyping, syncPromptFromTextarea]
  )

  const onImeInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (!promptPaneFocused) {
        return
      }
      allowEmptyFirstPickerSyncRef.current = false
      sessionListPickerDismissedRef.current = false
      if (skipHistResetRef.current) {
        skipHistResetRef.current = false
      } else if (!navPageTyping || isComposingRef.current) {
        setHistNavIndex(-1)
      }
      tabPressSeqRef.current = 0
      if (mode === "isearch") {
        setISearchCycle(0)
      }
      if (navPageTyping) {
        if (isComposingRef.current) {
          syncPromptFromTextareaForComposition(e.currentTarget, { composing: true })
        } else {
          syncPromptFromTextarea(e.currentTarget, { composing: false })
        }
        return
      }
      syncPromptFromTextarea(e.currentTarget, { composing: isComposingRef.current })
    },
    [mode, navPageTyping, promptPaneFocused, syncPromptFromTextarea, syncPromptFromTextareaForComposition]
  )

  const onImeSelect = useCallback(() => {
    if (!promptPaneFocused) {
      return
    }
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    const pos = ta.selectionEnd
    setCursorPos(pos)
    syncImeTokenPicker(ta.value, pos)
  }, [isComposing, promptPaneFocused, syncImeTokenPicker])

  const applyNavTypingMutation = useCallback(
    (ta: HTMLTextAreaElement, nextLine: string, nextCursor: number) => {
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      applyPromptLine(nextLine, nextCursor, ta)
    },
    [applyPromptLine]
  )

  const onBeforeInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (!navPageTyping || isComposingRef.current) {
        return
      }
      const ta = e.currentTarget
      const native = e.nativeEvent as InputEvent
      const shift = (native as InputEvent & { getModifierState(key: string): boolean }).getModifierState(
        "Shift"
      )
      if (navTypingShouldPreventLineBreakInput(native.inputType, shift, navTypingMultiline)) {
        e.preventDefault()
        return
      }
      if (
        native.inputType === "insertLineBreak" ||
        native.inputType === "insertParagraph"
      ) {
        e.preventDefault()
        const chunk = sanitizeNavTypingInsertText("\n", shift, navTypingMultiline)
        if (!chunk) {
          return
        }
        const { next, cursor } = navTypingInsert(
          lineRef.current,
          ta.selectionStart,
          ta.selectionEnd,
          chunk
        )
        applyNavTypingMutation(ta, next, cursor)
      }
    },
    [applyNavTypingMutation, navPageTyping, navTypingMultiline]
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!promptPaneFocused) {
        return
      }
      e.preventDefault()
      allowEmptyFirstPickerSyncRef.current = false
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const raw = e.clipboardData.getData("text/plain")
      const t = navPageTyping && navTypingMultiline ? raw : raw.replace(/[\r\n]+/g, " ")
      const curLn = lineRef.current
      const next = curLn.slice(0, start) + t + curLn.slice(end)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      if (mode === "isearch") {
        setISearchCycle(0)
      }
      lineRef.current = next
      setLine(next)
      setCursorPos(start + t.length)
      syncImeTokenPicker(next, start + t.length)
    },
    [mode, navPageTyping, navTypingMultiline, promptPaneFocused, syncImeTokenPicker]
  )

  const onCompositionStart = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      const snapshot = lineRef.current
      if (navPageTyping && ev.data === "" && ta.value === snapshot) {
        setCompositionAnchor(ta.selectionStart)
        return
      }
      isComposingRef.current = true
      compositionStartSnapshotRef.current = snapshot
      const anchor = ta.selectionStart
      const run = () => {
        setIsComposing(true)
        setCompositionAnchor(anchor)
        syncPromptFromTextarea(ta, { composing: true, newlineSnapshot: snapshot })
      }
      if (navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [navPageTyping, syncPromptFromTextarea]
  )

  const onCompositionUpdate = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      if (navPageTyping && !isComposingRef.current && ev.data.length > 0) {
        isComposingRef.current = true
        compositionStartSnapshotRef.current = lineRef.current
        const snapshot = compositionStartSnapshotRef.current
        flushSync(() => {
          setIsComposing(true)
          setCompositionAnchor(ta.selectionStart)
          syncPromptFromTextarea(ta, { composing: true, newlineSnapshot: snapshot })
        })
        return
      }
      syncPromptFromTextareaForComposition(ta, {
        composing: true,
        newlineSnapshot: compositionStartSnapshotRef.current
      })
    },
    [navPageTyping, syncPromptFromTextarea, syncPromptFromTextareaForComposition]
  )

  const onCompositionEnd = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      const snapshot = compositionStartSnapshotRef.current
      const run = () => {
        isComposingRef.current = false
        syncPromptFromTextarea(ta, { composing: false, newlineSnapshot: snapshot })
        compositionStartSnapshotRef.current = lineRef.current
        setIsComposing(false)
        setCompositionAnchor(0)
        allowEmptyFirstPickerSyncRef.current = false
      }
      if (navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [navPageTyping, syncPromptFromTextarea]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (navPageTyping) {
        if (e.key === "Tab") {
          e.preventDefault()
          return
        }
        if (
          e.key === "Enter" &&
          !e.nativeEvent.isComposing &&
          !(e.shiftKey && navTypingMultiline)
        ) {
          e.preventDefault()
        }
        return
      }

      if (!promptPaneFocused) {
        return
      }

      if (sessionNameTypingRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          closeSessionNameTyping()
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          submitLine()
          return
        }
      }

      if (e.nativeEvent.isComposing) {
        return
      }

      if (sessionListPickerHiRef.current !== null) {
        const rows = sessionListPickerRowsRef.current
        const commandLine = lineRef.current.trim()
        const pickerVariant = sessionPickerVariantRef.current
        if (e.key === "Escape") {
          e.preventDefault()
          closeSessionListPicker()
          return
        }
        const digit = /^[1-9]$/.test(e.key) ? Number.parseInt(e.key, 10) : null
        if (digit !== null && digit <= rows.length) {
          e.preventDefault()
          if (pickerVariant === "switch") {
            applySessionSwitchPick(digit - 1)
          } else {
            switchSessionFromListPicker(commandLine, digit - 1)
          }
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            const next = rows.length === 0 ? 0 : (at - 1 + rows.length) % rows.length
            sessionListPickerHiRef.current = next
            return next
          })
          return
        }
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            const next = rows.length === 0 ? 0 : (at + 1) % rows.length
            sessionListPickerHiRef.current = next
            return next
          })
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const pickHi = sessionListPickerHiRef.current ?? 0
          if (pickerVariant === "switch") {
            applySessionSwitchPick(pickHi)
          } else {
            switchSessionFromListPicker(commandLine, pickHi)
          }
          return
        }
      }

      if (
        e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === "c" || e.key === "C") &&
        bridgeRef.current.paneFocusRef.current === "search" &&
        bridgeRef.current.getSearchListPicker()?.phase === "loading" &&
        bridgeRef.current.isSearchListJobActive()
      ) {
        e.preventDefault()
        bridgeRef.current.cancelSearchPageScan()
        return
      }

      logBmxtKey("prompt", "keydown", {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        mode,
        tabPickerOpen: Boolean(bridgeRef.current.getTabPicker()),
        subCmdPickerOpen: Boolean(subCmdPickerRef.current)
      })

      const subPick = navPageTyping ? null : subCmdPickerRef.current
      if (subPick) {
        if (e.key === "Escape") {
          e.preventDefault()
          dismissImeTokenPicker()
          return
        }
        if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n === 0) {
            return
          }
          if (subPick.hi === 0) {
            dismissImeTokenPicker()
            return
          }
          setSubCmdPicker((s) => (s ? { ...s, hi: s.hi - 1 } : null))
          return
        }
        if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            setSubCmdPicker((s) => (s ? { ...s, hi: (s.hi + 1) % n } : null))
          }
          return
        }
        if (e.key === "Tab") {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            setSubCmdPicker((s) => (s ? { ...s, hi: (s.hi + 1) % n } : null))
          }
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          const trimmed = promptLine().trim()
          if (shouldAutoSubmitAfterTokenPick(trimmed)) {
            setSubCmdPicker(null)
            submitLine()
            return
          }
          applyTokenPickIndex(subPick.hi)
          return
        }
        if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          subPick.candidates.some((tok) => tok.toLowerCase().includes(e.key.toLowerCase()))
        ) {
          return
        }
      }

      if (e.key !== "Tab") {
        tabPressSeqRef.current = 0
      }

      if (mode === "isearch") {
        if (e.key === "Escape") {
          e.preventDefault()
          exitISearch()
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          submitLine()
          return
        }
        if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
          e.preventDefault()
          if (iSearchMatches.length > 0) {
            setISearchCycle((c) => (c + 1) % iSearchMatches.length)
          }
          return
        }
        if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (iSearchMatches.length > 0) {
            setISearchCycle((c) => (c - 1 + iSearchMatches.length) % iSearchMatches.length)
          }
          return
        }
        if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (iSearchMatches.length > 0) {
            setISearchCycle((c) => (c + 1) % iSearchMatches.length)
          }
          return
        }
        if (e.key === "Tab") {
          e.preventDefault()
          return
        }
        return
      }

      if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault()
        enterISearch()
        return
      }

      if (e.key === "Alt" && navArmed && isFocusedPane && paneFocus === "terminal") {
        e.preventDefault()
        if (navTypingMode) {
          return
        }
        if (!e.repeat) {
          handleToggleNavActive()
        }
        return
      }

      if (navKeyboardEnabled || navTypingMode || navMenuOpen || navTextSelPicking || navTextSelDone) {
        if (
          e.key === "Enter" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "Backspace" ||
          e.key === "Delete" ||
          e.key === "Tab" ||
          e.key === "Home" ||
          e.key === "End" ||
          (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
        ) {
          return
        }
      }

      if (e.key === "Tab") {
        imeTokenPickerDismissedRef.current = false
        sessionListPickerDismissedRef.current = false
        const curLn = lineRef.current
        const pos = cursorRef.current
        const muZone = tabsMoveUrlCompletionZone(curLn, pos)
        if (muZone) {
          e.preventDefault()
          void (async () => {
            const cands = await listTabsMoveUrlCandidates(muZone.prefix)
            if (cands.length === 0) {
              return
            }
            const idx = tabPressSeqRef.current % cands.length
            tabPressSeqRef.current += 1
            const rep = cands[idx]!
            const newLine =
              curLn.slice(0, muZone.urlStart) + rep + curLn.slice(muZone.tokenEnd)
            setHistNavIndex(-1)
            setLine(newLine)
            setCursorPos(muZone.urlStart + rep.length)
          })()
          return
        }
        if (curLn.trim() === "") {
          e.preventDefault()
          allowEmptyFirstPickerSyncRef.current = true
          tabPickerOpenRequestRef.current = true
          syncImeTokenPicker(curLn, pos)
          return
        }
        const imePick = resolveImeTokenPicker(curLn, pos, completionCandidatesRef.current, {
          emptyFirstPrefixShowsAll: true
        })
        if (imePick && imePick.candidates.length > 0) {
          e.preventDefault()
          tabPressSeqRef.current = 0
          tabPickerOpenRequestRef.current = true
          syncImeTokenPicker(curLn, pos)
          return
        }
      }

      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          return
        }
      }

      if (e.key === "ArrowUp" && !navKeyboardEnabled && !navTypingMode) {
        if (sessionListPickerHiRef.current !== null || sessionNameTypingRef.current) {
          return
        }
        e.preventDefault()
        if (history.length === 0) {
          return
        }
        if (histNavIndex === -1) {
          setHistDraft(lineRef.current)
          const idx = history.length - 1
          setHistNavIndex(idx)
          applyHistoryLine(history[idx] ?? "")
          return
        }
        if (histNavIndex > 0) {
          const next = histNavIndex - 1
          setHistNavIndex(next)
          applyHistoryLine(history[next] ?? "")
        }
        return
      }

      if (e.key === "ArrowDown" && !navKeyboardEnabled && !navTypingMode) {
        if (sessionListPickerHiRef.current !== null || sessionNameTypingRef.current) {
          return
        }
        e.preventDefault()
        if (histNavIndex === -1) {
          return
        }
        if (histNavIndex < history.length - 1) {
          const next = histNavIndex + 1
          setHistNavIndex(next)
          applyHistoryLine(history[next] ?? "")
          return
        }
        setHistNavIndex(-1)
        applyHistoryLine(histDraft)
        return
      }

      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !navKeyboardEnabled &&
        !navTypingMode &&
        !navMenuOpen &&
        !navTextSelPicking &&
        !navTextSelDone &&
        sessionListPickerHiRef.current === null &&
        !sessionNameTypingRef.current
      ) {
        e.preventDefault()
        submitLine()
      }
    },
    [
      applyHistoryLine,
      enterISearch,
      exitISearch,
      histDraft,
      histNavIndex,
      history,
      iSearchMatches,
      mode,
      applyTokenPickIndex,
      dismissImeTokenPicker,
      promptLine,
      submitLine,
      bridgeRef,
      syncImeTokenPicker,
      closeSessionNameTyping,
      closeSessionListPicker,
      navArmed,
      navKeyboardEnabled,
      navPageTyping,
      navTypingMode,
      navTypingMultiline,
      navMenuOpen,
      navTextSelPicking,
      navTextSelDone,
      isFocusedPane,
      applyNavTypingMutation,
      applySessionSwitchPick,
      switchSessionFromListPicker,
      paneFocus,
      handleToggleNavActive,
      promptPaneFocused
    ]
  )

  const showSearchListPatternPlaceholder = useMemo(
    () => shouldShowSearchListPatternPlaceholder(line, cursorPos),
    [line, cursorPos]
  )

  const navPromptValueControlled = !navPageTyping
  const showNavTypingPlaceholder =
    navPageTyping && line.trim() === "" && !isComposing
  const showSessionNameTypingPlaceholder = sessionNameTyping && !isComposing
  const mirror = promptMirrorSegments(line, cursorPos, isComposing, compositionAnchor)
  const iSearchPreview = iSearchMatches[iSearchCycle]

  useEffect(() => {
    const shell = bridgeRef.current
    if (!shell) {
      return
    }
    shell.onPromptBlockedChange({
      sessionNameTyping,
      mode,
      subCmdPickerOpen: subCmdPicker !== null,
      sessionListPickerOpen
    })
  }, [bridgeRef, sessionNameTyping, mode, subCmdPicker, sessionListPickerOpen])

  useEffect(() => {
    const shell = bridgeRef.current
    if (!shell) {
      return
    }
    shell.onNavTranslateMetaChange({
      busy: navTranslateBusy,
      statusNote: navTranslateStatus
    })
  }, [bridgeRef, navTranslateBusy, navTranslateStatus])

  const resolveTypingCommitText = useCallback(async (): Promise<string> => {
    const raw = imeRef.current?.value ?? lineRef.current
    if (!translateEnabledRef.current) {
      return raw
    }
    await flushNavTranslatePending()
    try {
      setNavTranslateCommitError(null)
      return await buildEnglishCommitText(
        raw,
        navTranslateBlocksRef.current,
        translatePairIdRef.current
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setNavTranslateCommitError(`commit failed: ${msg}`)
      throw e
    }
  }, [flushNavTranslatePending, setNavTranslateCommitError])

  useImperativeHandle(
    ref,
    () => ({
      getLine: () => lineRef.current,
      getCursor: () => cursorRef.current,
      focus: () => {
        imeRef.current?.focus()
      },
      blur: () => {
        imeRef.current?.blur()
      },
      setLine: (next: string) => {
        lineRef.current = next
        setLine(next)
      },
      setCursorPos: (pos: number) => {
        setCursorPos(pos)
      },
      resolveTypingCommitText,
      getTranslateBlocks: () => navTranslateBlocksRef.current,
      closePromptPickerUi,
      resetNavTranslateSession,
      isDetailBarKeyboardBlocked: () =>
        sessionNameTyping ||
        mode === "isearch" ||
        subCmdPicker !== null ||
        sessionListPickerOpen,
      isCaretAtPromptEnd: () => cursorRef.current >= lineRef.current.length
    }),
    [
      closePromptPickerUi,
      mode,
      resetNavTranslateSession,
      resolveTypingCommitText,
      sessionListPickerOpen,
      sessionNameTyping,
      subCmdPicker
    ]
  )

  return (
    <>
      {mode === "isearch" ? (
        <div className="bmxt-isearch">
          <span className="bmxt-isearch-label">(reverse-i-search)&apos;</span>
          <span className="bmxt-isearch-query">{line}</span>
          <span className="bmxt-isearch-label">&apos;: </span>
          <span className="bmxt-isearch-match">
            {iSearchMatches.length === 0 ? "(no match)" : iSearchPreview ?? "(no match)"}
          </span>
          <span className="bmxt-isearch-hint">
            {" "}
            Ctrl+R older · ↑ newer · ↓ older · Enter · Esc
          </span>
        </div>
      ) : null}
      <div
        className={`bmxt-prompt-line${navPageTyping ? " bmxt-prompt-line--nav-typing" : ""}${sessionNameTyping ? " bmxt-prompt-line--session-name-typing" : ""}`}>
        <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
        <div className="bmxt-prompt-field">
          <div className="bmxt-prompt-mirror" aria-hidden>
            <span>{mirror.before}</span>
            {mirror.composition ? (
              <span className="bmxt-prompt-composition">{mirror.composition}</span>
            ) : (
              <span
                ref={cursorMirrorCellRef}
                className={`bmxt-cursor-cell${mirror.cur ? "" : " bmxt-cursor-cell--eol"}${promptPaneFocused ? "" : " bmxt-cursor-cell--inactive"}`}>
                {mirror.cur || "\u00a0"}
              </span>
            )}
            <span>{mirror.after}</span>
          </div>
          <textarea
            ref={imeRef}
            className="bmxt-prompt-ime"
            rows={1}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            tabIndex={promptPaneFocused ? 0 : -1}
            aria-label={mode === "isearch" ? "Reverse incremental search" : "Command line"}
            placeholder={
              showNavTypingPlaceholder
                ? navTypingMultiline
                  ? uiCopy.t("prompt.navTypingMultiline")
                  : uiCopy.t("prompt.navTyping")
                : showSessionNameTypingPlaceholder
                  ? uiCopy.t("session.settingName.placeholder")
                  : showSearchListPatternPlaceholder
                    ? uiCopy.t("prompt.searchListPattern")
                    : mode === "normal" && line.trim() === ""
                      ? uiCopy.t("prompt.placeholder")
                      : undefined
            }
            value={navPromptValueControlled ? line : undefined}
            readOnly={!promptPaneFocused}
            onInput={onImeInput}
            onBeforeInput={onBeforeInput}
            onSelect={onImeSelect}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onCompositionStart={onCompositionStart}
            onCompositionUpdate={onCompositionUpdate}
            onCompositionEnd={onCompositionEnd}
          />
          {promptPickerOpen ? (
            <div
              ref={subCmdPickerHostRef}
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
          ) : null}
        </div>
      </div>
      {navPageTyping && translateEnabled ? (
        <TranslationStrip
          pairId={translatePairId}
          buffer={line}
          blocks={navTranslateBlocks}
          busy={navTranslateBusy}
          translatePending={navTranslatePending}
          statusNote={navTranslateStatus}
        />
      ) : null}
    </>
  )
}
)
