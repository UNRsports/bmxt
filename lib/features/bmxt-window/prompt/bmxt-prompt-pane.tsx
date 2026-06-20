import { flushSync } from "react-dom"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject
} from "react"
import {
  buildSessionSwitchCommandLine,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName,
  sanitizeSessionName,
  type SessionListRow
} from "../../session"
import { resolveImeTokenPicker } from "../../command-line"
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
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import { shouldAutoSubmitAfterTokenPick } from "./should-auto-submit-after-token-pick"
import type { PromptShellBridge } from "./prompt-shell-bridge"
import type { BmxtPromptHandle } from "./bmxt-prompt-handle"
import { paintPromptMirrorDom, type PromptMirrorDomRefs } from "./prompt-mirror-dom"
import {
  LazyBmxtPromptPickerIsland
} from "./lazy-prompt-picker-island"
import type { BmxtPromptPickerHandle } from "./bmxt-prompt-picker-island"
import { LazyTranslationStrip } from "./lazy-translation-strip"
import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen"

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

  const pickerIslandRef = useRef<BmxtPromptPickerHandle | null>(null)
  const sessionListRowsRef = useRef(sessionListRows)
  sessionListRowsRef.current = sessionListRows
  const currentSessionDisplayNameRef = useRef("")
  currentSessionDisplayNameRef.current = bridgeRef.current?.currentSessionDisplayName ?? ""

  const [sessionNameTyping, setSessionNameTyping] = useState(false)
  const sessionNameTypingRef = useRef(sessionNameTyping)
  sessionNameTypingRef.current = sessionNameTyping

  const [mode, setMode] = useState<"normal" | "isearch">("normal")
  /** EN: React line state only for reverse-i-search UI (normal prompt uses refs + DOM mirror). */
  const [iSearchLine, setISearchLine] = useState("")
  const [translateBuffer, setTranslateBuffer] = useState("")
  const [placeholderFlags, setPlaceholderFlags] = useState({
    showNav: false,
    showSessionName: false,
    showSearchList: false,
    showDefault: true
  })
  const [localCompletion, setLocalCompletion] = useState<string[]>(completionCandidates)
  const [isComposing, setIsComposing] = useState(false)
  const [pickerUiState, setPickerUiState] = useState({
    subCmdPickerOpen: false,
    sessionListPickerOpen: false
  })

  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const compositionAnchorRef = useRef(0)
  const mirrorBeforeRef = useRef<HTMLSpanElement>(null)
  const mirrorCompositionRef = useRef<HTMLSpanElement>(null)
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const mirrorAfterRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)

  const tabPressSeqRef = useRef(0)
  const lineRef = useRef("")
  const cursorRef = useRef(0)
  const navPromptSnapRef = useRef<{ line: string; cursor: number } | null>(null)
  const completionCandidatesRef = useRef<string[]>([])
  const allowEmptyFirstPickerSyncRef = useRef(false)
  const tabPickerOpenRequestRef = useRef(false)
  const imeTokenPickerDismissedRef = useRef(false)
  const sessionListPickerDismissedRef = useRef(false)

  const onPickerUiChange = useCallback(
    (state: { subCmdPickerOpen: boolean; sessionListPickerOpen: boolean }) => {
      setPickerUiState((prev) => {
        if (
          prev.subCmdPickerOpen === state.subCmdPickerOpen &&
          prev.sessionListPickerOpen === state.sessionListPickerOpen
        ) {
          return prev
        }
        return state
      })
    },
    []
  )

  const getMirrorDomRefs = useCallback((): PromptMirrorDomRefs => {
    return {
      beforeEl: mirrorBeforeRef.current,
      compositionEl: mirrorCompositionRef.current,
      cursorCellEl: cursorMirrorCellRef.current,
      afterEl: mirrorAfterRef.current
    }
  }, [])

  const updatePlaceholderFlags = useCallback(
    (ln: string, pos: number, composing: boolean) => {
      setPlaceholderFlags((prev) => {
        const next = {
          showNav: navPageTyping && ln.trim() === "" && !composing,
          showSessionName: sessionNameTyping && !composing,
          showSearchList: shouldShowSearchListPatternPlaceholder(ln, pos),
          showDefault: mode === "normal" && ln.trim() === ""
        }
        if (
          prev.showNav === next.showNav &&
          prev.showSessionName === next.showSessionName &&
          prev.showSearchList === next.showSearchList &&
          prev.showDefault === next.showDefault
        ) {
          return prev
        }
        return next
      })
    },
    [mode, navPageTyping, sessionNameTyping]
  )

  const paintMirror = useCallback(
    (ln: string, pos: number, composing: boolean, anchor: number) => {
      paintPromptMirrorDom(
        getMirrorDomRefs(),
        ln,
        pos,
        composing,
        anchor,
        promptPaneFocused
      )
    },
    [getMirrorDomRefs, promptPaneFocused]
  )

  const syncPicker = useCallback((ln: string, pos: number) => {
    pickerIslandRef.current?.sync(ln, pos)
  }, [])

  const commitPromptState = useCallback(
    (
      nextLine: string,
      nextCursor: number,
      ta?: HTMLTextAreaElement | null,
      opts?: { preserveSelection?: boolean; syncPicker?: boolean }
    ) => {
      lineRef.current = nextLine
      cursorRef.current = nextCursor
      paintMirror(nextLine, nextCursor, false, 0)

      if (mode === "isearch") {
        setISearchLine(nextLine)
      }
      if (navPageTyping && translateEnabled) {
        setTranslateBuffer(nextLine)
      }
      updatePlaceholderFlags(nextLine, nextCursor, false)

      if (opts?.syncPicker !== false) {
        syncPicker(nextLine, nextCursor)
      }

      const target = ta ?? imeRef.current
      if (target) {
        if (target.value !== nextLine) {
          target.value = nextLine
        }
        if (!opts?.preserveSelection) {
          target.setSelectionRange(nextCursor, nextCursor)
        }
      }
    },
    [mode, navPageTyping, paintMirror, sessionNameTyping, syncPicker, translateEnabled, updatePlaceholderFlags]
  )

  const updatePromptMirrorOnly = useCallback(
    (
      nextLine: string,
      nextCursor: number,
      composing: boolean,
      anchor: number,
      ta?: HTMLTextAreaElement | null
    ) => {
      lineRef.current = nextLine
      cursorRef.current = nextCursor
      paintMirror(nextLine, nextCursor, composing, anchor)
      if (navPageTyping && translateEnabled) {
        setTranslateBuffer(nextLine)
      }
      if (composing) {
        setIsComposing(true)
      }
      if (ta && composing) {
        if (ta.value !== nextLine) {
          ta.value = nextLine
        }
      }
    },
    [navPageTyping, paintMirror, translateEnabled]
  )

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
    buffer: translateBuffer,
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
    updatePlaceholderFlags(lineRef.current, cursorRef.current, isComposingRef.current)
  }, [sessionNameTyping, updatePlaceholderFlags])

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

  useEffect(() => {
    paintMirror(lineRef.current, cursorRef.current, isComposingRef.current, compositionAnchorRef.current)
  }, [paintMirror, promptPaneFocused])

  const getPickerSessionContext = useCallback(() => {
    return (
      pickerIslandRef.current?.getSessionListContext() ?? {
        rows: sessionListRowsRef.current,
        variant: null,
        hi: null
      }
    )
  }, [])

  const iSearchMatches = useMemo(
    () => matchesForSearch(history, mode === "isearch" ? iSearchLine : ""),
    [history, iSearchLine, mode]
  )

  const dismissImeTokenPicker = useCallback(() => {
    pickerIslandRef.current?.dismissToken()
  }, [])

  const closePromptPickerUi = useCallback(() => {
    pickerIslandRef.current?.closeAll()
  }, [])

  const focusPrompt = useCallback(() => {
    imeRef.current?.focus()
  }, [])

  const restoreNavPromptSnap = useCallback(() => {
    const snap = navPromptSnapRef.current
    if (!snap) {
      return
    }
    commitPromptState(snap.line, snap.cursor)
  }, [commitPromptState])

  const [histNavIndex, setHistNavIndex] = useState(-1)
  const [histDraft, setHistDraft] = useState("")
  const skipHistResetRef = useRef(false)

  const [iSearchCycle, setISearchCycle] = useState(0)
  const [iSearchSnapshot, setISearchSnapshot] = useState("")

  const getSubCmdPicker = useCallback(
    () => pickerIslandRef.current?.getSubCmdPicker() ?? null,
    []
  )

  const closeSessionNameTyping = useCallback(() => {
    setSessionNameTyping(false)
    commitPromptState("", 0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [commitPromptState, focusPrompt])

  const openSessionNameTyping = useCallback(
    (commandLine: string) => {
      pickerIslandRef.current?.clearSubCmdPicker()
      pickerIslandRef.current?.closeAll()
      sessionListPickerDismissedRef.current = false
      bridgeRef.current.appendCommandToHistory(commandLine)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const name = currentSessionDisplayNameRef.current
      setSessionNameTyping(true)
      commitPromptState(name, name.length)
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
      commitPromptState("", 0)
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
    pickerIslandRef.current?.closeAll()
    focusPrompt()
  }, [commitPromptState, focusPrompt])

  const switchSessionFromListPicker = useCallback(
    (commandLine: string, pickHi: number) => {
      const { rows, variant } = getPickerSessionContext()
      const row = rows[pickHi]
      sessionListPickerDismissedRef.current = false
      pickerIslandRef.current?.closeAll()
      bridgeRef.current.appendCommandToHistory(commandLine)
      commitPromptState("", 0)
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
    [bridgeRef.current.appendCommandToHistory, bridgeRef.current.appendLogLines, focusPrompt, bridgeRef.current.onActivateSession, getPickerSessionContext, uiCopy]
  )

  const applySessionSwitchPick = useCallback(
    (pickHi: number) => {
      const visibleRows = getPickerSessionContext().rows
      const allRows = sessionListRowsRef.current
      const row = visibleRows[pickHi]
      if (!row) {
        return
      }
      sessionListPickerDismissedRef.current = true
      pickerIslandRef.current?.closeAll()
      const nextLine = buildSessionSwitchCommandLine(row, allRows)
      commitPromptState(nextLine, nextLine.length)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      focusPrompt()
    },
    [commitPromptState, focusPrompt, getPickerSessionContext]
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
      pickerIslandRef.current?.clearSubCmdPicker()
      allowEmptyFirstPickerSyncRef.current = false
      imeTokenPickerDismissedRef.current = false
      isComposingRef.current = false
      compositionStartSnapshotRef.current = ""
      const initial = normalizeNavTypingInitialValue(
        detail.initialValue,
        detail.multiline
      )
      const applyEnter = () => {
        compositionAnchorRef.current = 0
        setIsComposing(false)
        commitPromptState(initial, initial.length)
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
      compositionAnchorRef.current = 0
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
      commitPromptState(next, next.length)
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
      commitPromptState(cont, cont.length)
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, uiCopy.t("setting.usage")])
      focusPrompt()
      return
    }

    if (parseSettingListPickerLine(trimmed)) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
        commitPromptState(cont, cont.length)
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
        commitPromptState(cont, cont.length)
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
        commitPromptState(cont, cont.length)
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
      commitPromptState("", 0)
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
      const ctx = getPickerSessionContext()
      const pickHi = ctx.hi ?? (activeIdx >= 0 ? activeIdx : 0)
      switchSessionFromListPicker(trimmed, pickHi)
      return
    }

    const sessionSwitchName = parseSessionSwitchWithLine(trimmed)
    if (sessionSwitchName !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
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
      syncPicker(lineRef.current, lineRef.current.length)
      focusPrompt()
      return
    }

    const sessionNumber = parseSessionSwitchByNumberLine(trimmed)
    if (sessionNumber !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
        commitPromptState(cont, cont.length)
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
        commitPromptState(cont, cont.length)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
      commitPromptState("", 0)
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
        commitPromptState(next, next.length)
        setHistNavIndex(-1)
        tabPressSeqRef.current = 0
        pickerIslandRef.current?.clearSubCmdPicker()
        focusPrompt()
        return
      }
      if (!isSearchListReadyToRun(trimmed, rawLine)) {
        focusPrompt()
        return
      }
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      pickerIslandRef.current?.clearSubCmdPicker()
      void bridgeRef.current.runSearchListSearch(trimmed, searchListLine)
      return
    }

    if (trimmed === "help" || trimmed === "?") {
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, ...buildHelpLines(bridgeRef.current.uiSettings.locale)])
      focusPrompt()
      return
    }

    const domListLine = parseDomListPickerLine(trimmed)
    if (domListLine !== null) {
      bridgeRef.current.appendCommandToHistory(trimmed)
      commitPromptState("", 0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      pickerIslandRef.current?.clearSubCmdPicker()
      void bridgeRef.current.runDomListAndShow(domListLine, trimmed, /*announce*/ true)
      return
    }

    bridgeRef.current.appendCommandToHistory(trimmed)
    const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
    commitPromptState("", 0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0

    const localBundle = runDispatch(trimmed, bridgeRef.current.uiSettings.locale)
    if (localBundle.ty === "lines") {
      void bridgeRef.current.appendLogLines([`> ${trimmed}`, ...(localBundle.lines ?? [])])
      if (continuationPrompt) {
        pickerIslandRef.current?.clearSubCmdPicker()
        commitPromptState(continuationPrompt, continuationPrompt.length)
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
      pickerIslandRef.current?.clearSubCmdPicker()
      commitPromptState(continuationPrompt, continuationPrompt.length)
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
    syncPicker,
    openSessionNameTyping,
    saveSessionDisplayName,
    applySessionSwitchPick,
    getPickerSessionContext,
    switchSessionFromListPicker
  ])

  const applyTokenPickIndex = useCallback(
    (idx: number) => {
      allowEmptyFirstPickerSyncRef.current = false
      imeTokenPickerDismissedRef.current = false
      const s = getSubCmdPicker()
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
      commitPromptState(nextLine, nextPos)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const trimmedNext = nextLine.trim()
      if (shouldAutoSubmitAfterTokenPick(trimmedNext)) {
        pickerIslandRef.current?.clearSubCmdPicker()
        queueMicrotask(() => submitLine())
        return
      }
      queueMicrotask(() => focusPrompt())
    },
    [commitPromptState, focusPrompt, submitLine]
  )

  const exitISearch = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = false
    setMode("normal")
    commitPromptState(iSearchSnapshot, iSearchSnapshot.length)
    setISearchCycle(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [commitPromptState, focusPrompt, iSearchSnapshot])

  const enterISearch = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = false
    setISearchSnapshot(lineRef.current)
    setMode("isearch")
    commitPromptState("", 0)
    setISearchCycle(0)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [commitPromptState, focusPrompt])

  const applyHistoryLine = useCallback(
    (text: string) => {
      allowEmptyFirstPickerSyncRef.current = false
      skipHistResetRef.current = true
      tabPressSeqRef.current = 0
      commitPromptState(text, text.length)
    },
    [commitPromptState]
  )

  const applyPromptLine = useCallback(
    (
      nextLine: string,
      nextCursor: number,
      ta?: HTMLTextAreaElement | null,
      opts?: { preserveSelection?: boolean; composing?: boolean }
    ) => {
      if (opts?.composing || isComposingRef.current) {
        updatePromptMirrorOnly(
          nextLine,
          nextCursor,
          true,
          compositionAnchorRef.current,
          ta
        )
        return
      }
      commitPromptState(nextLine, nextCursor, ta, {
        preserveSelection: opts?.preserveSelection
      })
    },
    [commitPromptState, updatePromptMirrorOnly]
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
      applyPromptLine(v, pos, ta, {
        preserveSelection: opts?.composing,
        composing: opts?.composing
      })
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
    cursorRef.current = pos
    paintMirror(ta.value, pos, false, 0)
    syncPicker(ta.value, pos)
  }, [isComposing, paintMirror, promptPaneFocused, syncPicker])

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
      commitPromptState(next, start + t.length, ta)
    },
    [commitPromptState, mode, navPageTyping, navTypingMultiline, promptPaneFocused]
  )

  const onCompositionStart = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      const snapshot = lineRef.current
      if (navPageTyping && ev.data === "" && ta.value === snapshot) {
        compositionAnchorRef.current = ta.selectionStart
        return
      }
      isComposingRef.current = true
      compositionStartSnapshotRef.current = snapshot
      const anchor = ta.selectionStart
      const run = () => {
        setIsComposing(true)
        compositionAnchorRef.current = anchor
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
          compositionAnchorRef.current = ta.selectionStart
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
        compositionAnchorRef.current = 0
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

      if (pickerIslandRef.current?.isSessionListOpen()) {
        const ctx = getPickerSessionContext()
        const rows = ctx.rows
        const commandLine = lineRef.current.trim()
        const pickerVariant = ctx.variant
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
          pickerIslandRef.current?.setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            return rows.length === 0 ? 0 : (at - 1 + rows.length) % rows.length
          })
          return
        }
        if (e.key === "ArrowDown") {
          e.preventDefault()
          pickerIslandRef.current?.setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            return rows.length === 0 ? 0 : (at + 1) % rows.length
          })
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const pickHi = ctx.hi ?? 0
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
        subCmdPickerOpen: Boolean(getSubCmdPicker())
      })

      const subPick = navPageTyping ? null : getSubCmdPicker()
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
          pickerIslandRef.current?.nudgeSubCmdPickerHi(-1)
          return
        }
        if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            pickerIslandRef.current?.cycleSubCmdPickerHi()
          }
          return
        }
        if (e.key === "Tab") {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            pickerIslandRef.current?.cycleSubCmdPickerHi()
          }
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          const trimmed = promptLine().trim()
          if (shouldAutoSubmitAfterTokenPick(trimmed)) {
            pickerIslandRef.current?.clearSubCmdPicker()
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
            commitPromptState(newLine, muZone.urlStart + rep.length)
          })()
          return
        }
        if (curLn.trim() === "") {
          e.preventDefault()
          allowEmptyFirstPickerSyncRef.current = true
          tabPickerOpenRequestRef.current = true
          syncPicker(curLn, pos)
          return
        }
        const imePick = resolveImeTokenPicker(curLn, pos, completionCandidatesRef.current, {
          emptyFirstPrefixShowsAll: true
        })
        if (imePick && imePick.candidates.length > 0) {
          e.preventDefault()
          tabPressSeqRef.current = 0
          tabPickerOpenRequestRef.current = true
          syncPicker(curLn, pos)
          return
        }
      }

      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          return
        }
      }

      if (e.key === "ArrowUp" && !navKeyboardEnabled && !navTypingMode) {
        if (pickerIslandRef.current?.isSessionListOpen() || sessionNameTypingRef.current) {
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
        if (pickerIslandRef.current?.isSessionListOpen() || sessionNameTypingRef.current) {
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
        !pickerIslandRef.current?.isSessionListOpen() &&
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
      syncPicker,
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
      getPickerSessionContext,
      switchSessionFromListPicker,
      paneFocus,
      handleToggleNavActive,
      promptPaneFocused
    ]
  )

  const iSearchPreview = iSearchMatches[iSearchCycle]

  useEffect(() => {
    const shell = bridgeRef.current
    if (!shell) {
      return
    }
    shell.onPromptBlockedChange({
      sessionNameTyping,
      mode,
      subCmdPickerOpen: pickerUiState.subCmdPickerOpen,
      sessionListPickerOpen: pickerUiState.sessionListPickerOpen
    })
  }, [bridgeRef, sessionNameTyping, mode, pickerUiState])

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
        commitPromptState(next, next.length)
      },
      setCursorPos: (pos: number) => {
        commitPromptState(lineRef.current, pos)
      },
      resolveTypingCommitText,
      getTranslateBlocks: () => navTranslateBlocksRef.current,
      closePromptPickerUi,
      resetNavTranslateSession,
      isDetailBarKeyboardBlocked: () =>
        sessionNameTyping ||
        mode === "isearch" ||
        pickerUiState.subCmdPickerOpen ||
        pickerUiState.sessionListPickerOpen,
      isCaretAtPromptEnd: () => cursorRef.current >= lineRef.current.length
    }),
    [
      closePromptPickerUi,
      commitPromptState,
      mode,
      pickerUiState,
      resetNavTranslateSession,
      resolveTypingCommitText,
      sessionNameTyping
    ]
  )

  return (
    <>
      {mode === "isearch" ? (
        <div className="bmxt-isearch">
          <span className="bmxt-isearch-label">(reverse-i-search)&apos;</span>
          <span className="bmxt-isearch-query">{iSearchLine}</span>
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
            <span ref={mirrorBeforeRef} />
            <span ref={mirrorCompositionRef} className="bmxt-prompt-composition" hidden />
            <span ref={cursorMirrorCellRef} className="bmxt-cursor-cell" />
            <span ref={mirrorAfterRef} />
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
              placeholderFlags.showNav
                ? navTypingMultiline
                  ? uiCopy.t("prompt.navTypingMultiline")
                  : uiCopy.t("prompt.navTyping")
                : placeholderFlags.showSessionName
                  ? uiCopy.t("session.settingName.placeholder")
                  : placeholderFlags.showSearchList
                    ? uiCopy.t("prompt.searchListPattern")
                    : placeholderFlags.showDefault
                      ? uiCopy.t("prompt.placeholder")
                      : undefined
            }
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
          <LazyBmxtPromptPickerIsland
            pickerRef={pickerIslandRef}
            sessionId={sessionId}
            scrollRef={scrollRef}
            promptPaneFocused={promptPaneFocused}
            sessionListRows={sessionListRows}
            mode={mode}
            navPageTyping={navPageTyping}
            completionCandidatesRef={completionCandidatesRef}
            bridgeRef={bridgeRef}
            cursorMirrorCellRef={cursorMirrorCellRef}
            hostRef={subCmdPickerHostRef}
            allowEmptyFirstPickerSyncRef={allowEmptyFirstPickerSyncRef}
            tabPickerOpenRequestRef={tabPickerOpenRequestRef}
            imeTokenPickerDismissedRef={imeTokenPickerDismissedRef}
            sessionListPickerDismissedRef={sessionListPickerDismissedRef}
            sessionNameTypingRef={sessionNameTypingRef}
            sessionListRowsRef={sessionListRowsRef}
            onPickerUiChange={onPickerUiChange}
          />
        </div>
      </div>
      {navPageTyping && translateEnabled ? (
        <LazyTranslationStrip
          pairId={translatePairId}
          buffer={translateBuffer}
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
