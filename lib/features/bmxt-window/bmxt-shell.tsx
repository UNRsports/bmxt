import { flushSync } from "react-dom"
import { TerminalLogLines } from "./terminal-log-lines"
import {
  isSessionSettingNameUiLine,
  isSessionSwitchUiLine,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  parseSessionSwitchByNumberLine,
  resolveSessionDisplayName,
  filterSessionSwitchPickerRows,
  sessionSwitchCommandName,
  resolveSessionSwitchPickerState,
  SessionListCandidatePanel,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../session"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../command-line"
import {
  resolveInitialTabPickerHighlightIndex,
  type TabPickerRow
} from "../tabs/picker-rows"
import {
  listTabsMoveUrlCandidates,
  parseGroupNewInteractiveLine,
  parseTabsExitListLine,
  parseTabsListPickerLine,
  tabsMoveUrlCompletionZone
} from "../tabs/input"
import {
  loadTabsPickerSettings,
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode,
  TABS_PAGE_ACTIVE_MODE_TOKENS,
  type TabsPageActiveMode
} from "../tabs/page-active-setting"
import {
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../tabs/engine"
import {
  loadSearchPickerSettings,
  saveSearchPageActiveMode,
  type SearchPageActiveMode
} from "../search/page-active-setting"
import type { SearchOpenDestinationRow } from "../search/search-open-destination"
import {
  openPickerSlots,
  type PickerSlotId,
  type SessionPickerState,
  type SessionPickersByLeaf
} from "../side-picker/session/session-pickers"
import { PickerRail } from "../side-picker/wrappers/picker-rail"
import { usePickerRailPresence } from "../side-picker/wrappers/use-picker-rail-presence"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import {
  detailBarToPickerSlot,
  isPickerDetailBar,
  listVisibleDetailBars,
  pickerSlotToDetailBar,
  resolvePickerColumnOrder,
  type DetailBarId
} from "./detail-bar-focus"
import { useDetailBarKeyboard } from "./use-detail-bar-keyboard"
import { TokenPickerPanel, type TokenPickerModel } from "./token-picker-panel"
import { PromptInput } from "./shell/PromptInput"
import { useCommandDispatch } from "./shell/useCommandDispatch"
import { useLogScroll } from "./shell/useLogScroll"
import { useSessionPromptActions } from "./shell/useSessionPromptActions"
import { useDomListShell } from "./shell/useDomListShell"
import { useSearchListShell } from "./shell/useSearchListShell"
import { useSettingPickerShell } from "./shell/useSettingPickerShell"
import { usePickerManager } from "./shell/usePickerManager"
import {
  parseSearchExitListLine,
  parseSearchListPickerLine,
  shouldShowSearchListPatternPlaceholder,
  type SearchListPickerState
} from "../search/search-list-picker-input"
import { isJobHandleActive, useSessionJobRunner } from "../job"
import { parseDomExitListLine, parseDomListPickerLine, type DomListPickerState } from "../dom/dom-list-picker-input"
import {
  NAV_ENTER_TYPING_EVENT,
  NAV_EXIT_TYPING_EVENT,
  parseNavEnterLine,
  parseNavExitLine,
  useNavMode,
  type NavEnterTypingDetail,
  type NavPositionsByTab
} from "../nav"
import { ModeStatusBarStack } from "./mode-status-bar-stack"
import {
  activateModeToolbar,
  deactivateModeToolbar,
  type ModeToolbarId
} from "./mode-toolbar-order"
import {
  navTypingInsert,
  navTypingShouldPreventLineBreakInput,
  normalizeNavTypingInitialValue,
  promptMirrorSegments,
  sanitizeNavTypingDomValueWithCursor,
  sanitizeNavTypingInsertText
} from "../nav/nav-prompt-input"
import {
  buildEnglishCommitText,
  DEFAULT_TRANSLATION_PAIR_ID,
  listTranslationPairSettingTokens,
  loadTranslateSettings,
  parseTranslateCommandLine,
  saveTranslateEnabled,
  saveTranslatePair,
  settingTokenForPairId,
  TranslationStrip,
  useSentenceTranslate,
  type TranslationBlock,
  type TranslationPairId
} from "../translate"
import { TRANSLATION_PAIR_IDS } from "../translate/translation-pair"
import { t } from "../setting/i18n/messages"
import { formatBulletedLines, versionUpgradeTitle } from "../setting/i18n/resolvers"
import { setRunLocale } from "../setting/i18n/run-locale"
import { settingTokenForUiLocale } from "../setting/locale"
import { type SettingListPickerState } from "../setting/setting-list-picker-state"
import {
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine
} from "../setting/setting-list-picker-input"
import { useUiCopy } from "../setting/use-ui-copy"
import { useUiSettings } from "../setting/use-ui-settings"
import { logBmxtKey } from "../debug/key-log"
import { matchesForSearch } from "./text-utils"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../bmxt-core"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction
} from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "./csp-dynamic-stylesheet"
import type { PostUpgradeBanner } from "./use-version-upgrade-banner"
import {
  measureFloatingPickerHostPosition,
  shouldAutoSubmitAfterTokenPick,
  shouldKeepSessionSwitchPickerOpen
} from "./shell/bmxt-shell-prompt-helpers"

export type { TabPickerState } from "../side-picker/session/tab-picker-state"
import type { TabPickerState } from "../side-picker/session/tab-picker-state"

type Props = {
  /** コマンド実行・ログ追記のスコープ（複数ターミナルセッション）。 */
  sessionId: string
  /** アクティブセッションだけがキーボード入力を受け取る。 */
  isFocusedPane: boolean
  lines: string[]
  history: string[]
  completionCandidates: string[]
  sessionOrder: string[]
  activeSessionId: string
  sessionNamesById: Record<string, string | undefined>
  sessionLogsById: Record<string, string[] | undefined>
  /** EN: Pre-built session list rows (avoids passing full `pickersBySession` into every shell). */
  sessionListRows: SessionListRow[]
  navArmedByLeaf: Record<string, boolean>
  onActivateSession: (sessionId: string) => Promise<void>
  onSetSessionDisplayName: (sessionId: string, name: string) => Promise<void>
  appendLogLines: (newLines: string[]) => Promise<void>
  appendCommandToHistory: (cmd: string) => void
  sessionPickers: SessionPickerState
  /** 第1引数でセッションを固定（非同期完了後も正しいターミナルに紐づく）。 */
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
  ) => void
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
  /** マニフェスト更新後の初回起動のみ（ウェルカムと併せて表示）。 */
  postUpgradeBanner: PostUpgradeBanner | null
  paneFocus: PaneFocusTarget
  onPaneFocusChange: (target: PaneFocusTarget) => void
  detailBarId: DetailBarId | null
  onDetailBarIdChange: (update: SetStateAction<DetailBarId | null>) => void
  modeToolbarOrder: ModeToolbarId[]
  onModeToolbarOrderChange: (update: SetStateAction<ModeToolbarId[]>) => void
  navArmed: boolean
  onNavArmedChange: (armed: boolean) => void
}

export function BmxtShell({
  sessionId,
  isFocusedPane,
  lines,
  history,
  completionCandidates,
  sessionOrder,
  activeSessionId,
  sessionNamesById,
  sessionLogsById,
  sessionListRows,
  navArmedByLeaf,
  onActivateSession,
  onSetSessionDisplayName,
  appendLogLines,
  appendCommandToHistory,
  sessionPickers,
  setSessionPickerSlot,
  refreshTabPickerRows,
  scheduleTabPickerRowsRefresh,
  postUpgradeBanner,
  paneFocus,
  onPaneFocusChange,
  detailBarId,
  onDetailBarIdChange,
  modeToolbarOrder,
  onModeToolbarOrderChange,
  navArmed,
  onNavArmedChange
}: Props) {
  const { settings: uiSettings, replaceSettings: replaceUiSettingsState } = useUiSettings()
  const uiCopy = useUiCopy()
  const prevUiLocaleRef = useRef(uiSettings.locale)
  useEffect(() => {
    setRunLocale(uiSettings.locale)
    if (prevUiLocaleRef.current !== uiSettings.locale) {
      prevUiLocaleRef.current = uiSettings.locale
      scheduleTabPickerRowsRefresh()
    }
  }, [uiSettings.locale, scheduleTabPickerRowsRefresh])
  const translateEnabledRef = useRef(false)
  const {
    tabPicker,
    searchListPicker,
    domListPicker,
    settingListPicker,
    setTabPicker,
    setSearchListPicker,
    setDomListPicker,
    setSettingListPicker,
    sidePickerOpen
  } = usePickerManager({
    sessionId,
    sessionPickers,
    setSessionPickerSlot,
    paneFocus,
    onPaneFocusChange,
    detailBarId,
    onDetailBarIdChange,
    modeToolbarOrder,
    onModeToolbarOrderChange,
    navArmed,
    translateEnabled: translateEnabledRef.current
  })

  const paneFocusRef = useRef<PaneFocusTarget>(paneFocus)
  const isFocusedPaneRef = useRef(isFocusedPane)
  const openPickersRef = useRef<readonly PickerSlotId[]>([])
  const pickerColumnOrderRef = useRef<readonly PickerSlotId[]>([])
  const [pickerPulseSlot, setPickerPulseSlot] = useState<PickerSlotId | null>(null)
  const pickerPulseTimerRef = useRef<number | null>(null)
  const skipNextPromptFocusRef = useRef(false)
  const prevOpenPickersRef = useRef<readonly PickerSlotId[] | null>(null)
  const tabPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const searchPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const domPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const settingPickerInputRef = useRef<HTMLTextAreaElement | null>(null)

  const openPickers = useMemo(
    () => openPickerSlots(sessionPickers),
    [sessionPickers]
  )

  const { railPickers, railExpanded, displaySessionPickers } = usePickerRailPresence(
    openPickers,
    sessionPickers
  )
  const pickersForColumnOrder = railPickers.length > 0 ? railPickers : openPickers
  const displayTabPicker = displaySessionPickers.tabs
  const displaySearchListPicker = displaySessionPickers.search
  const displayDomListPicker = displaySessionPickers.dom
  const displaySettingListPicker = displaySessionPickers.setting

  const tabsPickerKeyboardActive = paneFocus === "tabs" && isFocusedPane
  const searchPickerKeyboardActive = paneFocus === "search" && isFocusedPane
  const domPickerKeyboardActive = paneFocus === "dom" && isFocusedPane
  const settingPickerKeyboardActive = paneFocus === "setting" && isFocusedPane

  useEffect(() => {
    paneFocusRef.current = paneFocus
  }, [paneFocus])

  isFocusedPaneRef.current = isFocusedPane
  openPickersRef.current = openPickers

  const tabPickerRef = useRef<TabPickerState | null>(null)
  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])
  const searchListPickerRef = useRef<SearchListPickerState | null>(null)
  useEffect(() => {
    searchListPickerRef.current = searchListPicker
  }, [searchListPicker])
  const domListPickerRef = useRef<DomListPickerState | null>(null)
  useEffect(() => {
    domListPickerRef.current = domListPicker
  }, [domListPicker])
  const settingListPickerRef = useRef<SettingListPickerState | null>(null)
  useEffect(() => {
    settingListPickerRef.current = settingListPicker
  }, [settingListPicker])
  const jobRunner = useSessionJobRunner(sessionId)
  const [navActive, setNavActive] = useState(false)
  const [translateEnabled, setTranslateEnabled] = useState(false)
  const [translatePairId, setTranslatePairId] = useState<TranslationPairId>(
    DEFAULT_TRANSLATION_PAIR_ID
  )
  const translatePairIdRef = useRef<TranslationPairId>(DEFAULT_TRANSLATION_PAIR_ID)
  const [tabsPageActiveMode, setTabsPageActiveMode] = useState<TabsPageActiveMode>("auto")
  const tabsPageActiveModeRef = useRef<TabsPageActiveMode>("auto")
  const [searchPageActiveMode, setSearchPageActiveMode] = useState<SearchPageActiveMode>("auto")
  const searchPageActiveModeRef = useRef<SearchPageActiveMode>("auto")
  const navTranslateBlocksRef = useRef<readonly TranslationBlock[]>([])
  const flushNavTranslateRef = useRef<() => Promise<void>>(async () => {})
  const setNavTranslateCommitErrorRef = useRef<(message: string | null) => void>(() => {})
  const navPositionsRef = useRef<NavPositionsByTab>({})
  const setDetailBarId = useCallback(
    (update: SetStateAction<DetailBarId | null>) => {
      onDetailBarIdChange(update)
    },
    [onDetailBarIdChange]
  )
  const setModeToolbarOrder = useCallback(
    (update: SetStateAction<ModeToolbarId[]>) => {
      onModeToolbarOrderChange(update)
    },
    [onModeToolbarOrderChange]
  )
  const setNavArmed = useCallback(
    (armed: boolean) => {
      onNavArmedChange(armed)
    },
    [onNavArmedChange]
  )

  const {
    runDomListAndShow,
    onTabsPickerFocusTabId,
    syncTabPickerOpen,
    clearTabsPickerFocusTabId
  } = useDomListShell({
    sessionId,
    uiLocale: uiSettings.locale,
    uiCopy,
    jobRunner,
    domListPicker,
    appendLogLines,
    setDomListPicker,
    setModeToolbarOrder
  })
  useEffect(() => {
    if (tabPicker === null) {
      clearTabsPickerFocusTabId()
    }
  }, [tabPicker, clearTabsPickerFocusTabId])
  useEffect(() => {
    syncTabPickerOpen(tabPicker !== null)
  }, [tabPicker, syncTabPickerOpen])

  const navArmedRef = useRef(false)
  const navActiveRef = useRef(false)
  useEffect(() => {
    navArmedRef.current = navArmed
  }, [navArmed])
  useEffect(() => {
    navActiveRef.current = navActive
  }, [navActive])

  const {
    currentTabTitle: navCurrentTabTitle,
    overlayError: navOverlayError,
    typingMode: navPageTyping,
    typingMultiline: navTypingMultiline,
    menuOpen: navMenuOpen,
    textSelPhase: navTextSelPhase,
    toggleActive: toggleNavActive,
    teardownAll: teardownNav,
    navKeyboardEnabled,
    navTypingMode,
    textSelPicking: navTextSelPicking
  } = useNavMode({
    armed: navArmed,
    active: navActive,
    setActive: setNavActive,
    isFocusedPane,
    paneFocus,
    positionsRef: navPositionsRef,
    translateAssistActive: translateEnabled,
    getTypingBuffer: () => imeRef.current?.value ?? lineRef.current,
    resolveTypingCommitText: async () => {
      const raw = imeRef.current?.value ?? lineRef.current
      if (!translateEnabledRef.current) {
        return raw
      }
      await flushNavTranslateRef.current()
      try {
        setNavTranslateCommitErrorRef.current(null)
        return await buildEnglishCommitText(
          raw,
          navTranslateBlocksRef.current,
          translatePairIdRef.current
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setNavTranslateCommitErrorRef.current(`commit failed: ${msg}`)
        throw e
      }
    },
    uiLocale: uiSettings.locale
  })

  const navTextSelDone = navTextSelPhase === "done"

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

  const [sessionNameTyping, setSessionNameTyping] = useState(false)
  const sessionNameTypingRef = useRef(sessionNameTyping)
  sessionNameTypingRef.current = sessionNameTyping

  const currentSessionDisplayName = useMemo(() => {
    const index = sessionOrder.indexOf(sessionId)
    return resolveSessionDisplayName({
      sessionId,
      index: index >= 0 ? index + 1 : 1,
      namesById: sessionNamesById,
      pickers: sessionPickers,
      navArmed: navArmedByLeaf[sessionId] ?? false,
      logs: sessionLogsById[sessionId] ?? []
    })
  }, [sessionId, sessionOrder, sessionNamesById, sessionLogsById, sessionPickers, navArmedByLeaf])
  const currentSessionDisplayNameRef = useRef(currentSessionDisplayName)
  currentSessionDisplayNameRef.current = currentSessionDisplayName

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
  const {
    searchLoadingProgressLines,
    showSearchListPatternPlaceholder,
    runSearchListSearch,
    cancelSearchPageScan,
    onOpenSearchPickerEntry,
    clearSearchLoadingProgress
  } = useSearchListShell({
    sessionId,
    uiLocale: uiSettings.locale,
    uiCopy,
    jobRunner,
    line,
    cursorPos,
    appendLogLines,
    setSearchListPicker,
    setModeToolbarOrder,
    setSubCmdPicker,
    searchListPickerRef
  })
  const { scrollRef, logScrollable, syncLogScroll } = useLogScroll({
    lines,
    mode,
    line,
    postUpgradeBanner
  })
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

  useEffect(() => {
    translateEnabledRef.current = translateEnabled
  }, [translateEnabled])

  useEffect(() => {
    translatePairIdRef.current = translatePairId
  }, [translatePairId])

  useEffect(() => {
    navTranslateBlocksRef.current = navTranslateBlocks
  }, [navTranslateBlocks])

  useEffect(() => {
    flushNavTranslateRef.current = flushNavTranslatePending
  }, [flushNavTranslatePending])

  useEffect(() => {
    setNavTranslateCommitErrorRef.current = setNavTranslateCommitError
  }, [setNavTranslateCommitError])

  useEffect(() => {
    void loadTranslateSettings().then((s) => {
      setTranslateEnabled(s.enabled)
      setTranslatePairId(s.pair)
      if (s.enabled) {
        setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
      }
    })
    void loadTabsPickerSettings().then((s) => {
      setTabsPageActiveMode(s.pageActive)
      tabsPageActiveModeRef.current = s.pageActive
    })
    void loadSearchPickerSettings().then((s) => {
      setSearchPageActiveMode(s.pageActive)
      searchPageActiveModeRef.current = s.pageActive
    })
  }, [])

  useEffect(() => {
    tabsPageActiveModeRef.current = tabsPageActiveMode
  }, [tabsPageActiveMode])

  useEffect(() => {
    searchPageActiveModeRef.current = searchPageActiveMode
  }, [searchPageActiveMode])

  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)
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
      if (paneFocusRef.current !== "terminal") {
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

  useEffect(() => {
    if (isComposing || navPageTyping) {
      return
    }
    syncImeTokenPicker(line, cursorPos)
  }, [line, cursorPos, isComposing, navPageTyping, syncImeTokenPicker, localCompletion])

  useEffect(() => {
    if (iSearchCycle >= iSearchMatches.length && iSearchMatches.length > 0) {
      setISearchCycle(0)
    }
    if (iSearchMatches.length === 0) {
      setISearchCycle(0)
    }
  }, [iSearchMatches.length, iSearchCycle, iSearchMatches])

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

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => imeRef.current?.focus())
  }, [])

  const {
    closeSessionNameTyping,
    openSessionNameTyping,
    saveSessionDisplayName,
    closeSessionListPicker,
    switchSessionFromListPicker,
    applySessionSwitchPick
  } = useSessionPromptActions({
    sessionId,
    sessionListRows,
    uiCopy,
    appendCommandToHistory,
    appendLogLines,
    onActivateSession,
    onSetSessionDisplayName,
    focusPrompt,
    setSubCmdPicker,
    setLine,
    setCursorPos,
    setHistNavIndex,
    tabPressSeqRef,
    lineRef,
    imeRef,
    currentSessionDisplayNameRef,
    sessionListPickerDismissedRef,
    sessionListRowsRef,
    sessionListPickerRowsRef,
    sessionPickerVariantRef,
    setSessionListPickerHi,
    setSessionPickerVariant,
    setSessionNameTyping,
    sessionNameTypingRef
  })

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

  const pickerInputRefForSlot = useCallback((slot: PickerSlotId) => {
    switch (slot) {
      case "tabs":
        return tabPickerInputRef
      case "search":
        return searchPickerInputRef
      case "dom":
        return domPickerInputRef
      case "setting":
        return settingPickerInputRef
    }
  }, [])

  const pulsePickerColumn = useCallback((slot: PickerSlotId) => {
    setPickerPulseSlot(slot)
    if (pickerPulseTimerRef.current !== null) {
      window.clearTimeout(pickerPulseTimerRef.current)
    }
    pickerPulseTimerRef.current = window.setTimeout(() => {
      setPickerPulseSlot(null)
      pickerPulseTimerRef.current = null
    }, 360)
  }, [])

  const focusPickerSlot = useCallback(
    (slot: PickerSlotId) => {
      skipNextPromptFocusRef.current = true
      onPaneFocusChange(slot)
      requestAnimationFrame(() => {
        const input = pickerInputRefForSlot(slot).current
        if (input) {
          input.focus()
          return
        }
        requestAnimationFrame(() => {
          pickerInputRefForSlot(slot).current?.focus()
        })
      })
    },
    [onPaneFocusChange, pickerInputRefForSlot]
  )

  const activatePaneFocus = useCallback(
    (target: PaneFocusTarget) => {
      if (target === "terminal") {
        onPaneFocusChange(target)
        focusPrompt()
      } else if (target === "detailBar") {
        onPaneFocusChange(target)
        imeRef.current?.blur()
      } else {
        focusPickerSlot(target)
      }
    },
    [focusPickerSlot, focusPrompt, onPaneFocusChange]
  )

  const activateDetailBar = useCallback(
    (id: DetailBarId) => {
      closePromptPickerUi()
      setDetailBarId(id)
      onPaneFocusChange("detailBar")
      imeRef.current?.blur()
      if (isPickerDetailBar(id)) {
        pulsePickerColumn(detailBarToPickerSlot(id))
      }
    },
    [closePromptPickerUi, onPaneFocusChange, pulsePickerColumn, setDetailBarId]
  )

  const enterPickerFromDetailBar = useCallback(() => {
    if (detailBarId === null || !isPickerDetailBar(detailBarId)) {
      return
    }
    focusPickerSlot(detailBarToPickerSlot(detailBarId))
  }, [detailBarId, focusPickerSlot])

  const exitPickerToDetailBar = useCallback(
    (slot: PickerSlotId) => {
      activateDetailBar(pickerSlotToDetailBar(slot))
    },
    [activateDetailBar]
  )

  const exitDetailBarToTerminal = useCallback(() => {
    onPaneFocusChange("terminal")
    const end = lineRef.current.length
    setCursorPos(end)
    focusPrompt()
  }, [focusPrompt, onPaneFocusChange])

  const closeSettingPickerColumn = useCallback(() => {
    setSettingListPicker(sessionId, null)
    setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "setting"))
    activatePaneFocus("terminal")
  }, [activatePaneFocus, sessionId, setSettingListPicker, setModeToolbarOrder])

  const focusTerminalForNavControl = useCallback(() => {
    exitDetailBarToTerminal()
  }, [exitDetailBarToTerminal])

  const focusNavDetailBar = useCallback(() => {
    if (!navArmedRef.current) {
      return
    }
    activateDetailBar("nav")
  }, [activateDetailBar])

  const handleToggleNavActive = useCallback(() => {
    const turningOn = !navActiveRef.current
    toggleNavActive()
    if (turningOn) {
      focusTerminalForNavControl()
    } else {
      focusNavDetailBar()
    }
  }, [focusNavDetailBar, focusTerminalForNavControl, toggleNavActive])

  const toggleTabsPageActiveFromDetailBar = useCallback(() => {
    const next: TabsPageActiveMode =
      tabsPageActiveModeRef.current === "auto" ? "manual" : "auto"
    void saveTabsPageActiveMode(next).then(() => {
      setTabsPageActiveMode(next)
      tabsPageActiveModeRef.current = next
    })
  }, [])

  const toggleSearchPageActiveFromDetailBar = useCallback(() => {
    const next: SearchPageActiveMode =
      searchPageActiveModeRef.current === "auto" ? "manual" : "auto"
    void saveSearchPageActiveMode(next).then(() => {
      setSearchPageActiveMode(next)
      searchPageActiveModeRef.current = next
    })
  }, [])

  const cycleTranslatePairFromDetailBar = useCallback(
    (direction: 1 | -1) => {
      const index = TRANSLATION_PAIR_IDS.indexOf(translatePairIdRef.current)
      const next =
        TRANSLATION_PAIR_IDS[
          (index + direction + TRANSLATION_PAIR_IDS.length) % TRANSLATION_PAIR_IDS.length
        ]!
      void (async () => {
        await saveTranslatePair(next)
        setTranslatePairId(next)
        resetNavTranslateSession()
      })()
    },
    [resetNavTranslateSession]
  )

  const isDetailBarVisible = useCallback(
    (id: DetailBarId): boolean => {
      if (id === "nav") {
        return navArmed
      }
      if (id === "translate") {
        return translateEnabled
      }
      if (id === "tabs") {
        return tabPicker !== null
      }
      if (id === "search") {
        return searchListPicker !== null
      }
      if (id === "dom") {
        return domListPicker !== null
      }
      return settingListPicker !== null
    },
    [
      domListPicker,
      navArmed,
      searchListPicker,
      settingListPicker,
      tabPicker,
      translateEnabled
    ]
  )

  const visibleDetailBars = useMemo(
    () => listVisibleDetailBars(modeToolbarOrder, isDetailBarVisible),
    [isDetailBarVisible, modeToolbarOrder]
  )

  const pickerColumnOrder = useMemo(() => {
    const focusedPickerSlot =
      paneFocus !== "terminal" && paneFocus !== "detailBar" ? paneFocus : null
    const highlightSlot =
      paneFocus === "detailBar" && detailBarId !== null && isPickerDetailBar(detailBarId)
        ? detailBarToPickerSlot(detailBarId)
        : focusedPickerSlot
    const order = resolvePickerColumnOrder(
      pickersForColumnOrder,
      highlightSlot,
      pickerColumnOrderRef.current
    )
    pickerColumnOrderRef.current = order
    return order
  }, [detailBarId, paneFocus, pickersForColumnOrder])

  useDetailBarKeyboard({
    enabled: visibleDetailBars.length > 0 || navArmed,
    isFocusedPane,
    paneFocus,
    visibleDetailBars,
    detailBarId,
    navArmed,
    navActive,
    navTypingMode,
    blocked: navPageTyping || sessionNameTyping || mode === "isearch" || subCmdPicker !== null || sessionListPickerOpen,
    isCaretAtPromptEnd: () => cursorRef.current >= lineRef.current.length,
    actions: {
      activateDetailBar,
      enterPickerFromDetailBar,
      exitDetailBarToTerminal,
      toggleNavActive: handleToggleNavActive,
      cycleTranslatePair: cycleTranslatePairFromDetailBar,
      toggleTabsPageActive: toggleTabsPageActiveFromDetailBar,
      toggleSearchPageActive: toggleSearchPageActiveFromDetailBar
    }
  })

  const promptPaneFocused = isFocusedPane && paneFocus === "terminal"

  useLayoutEffect(() => {
    const prev = prevOpenPickersRef.current
    if (prev === null) {
      prevOpenPickersRef.current = openPickers
      return
    }
    const newlyOpened = openPickers.filter((slot) => !prev.includes(slot))
    prevOpenPickersRef.current = openPickers
    if (!isFocusedPane || newlyOpened.length === 0) {
      return
    }
    focusPickerSlot(newlyOpened[newlyOpened.length - 1]!)
  }, [focusPickerSlot, isFocusedPane, openPickers])

  const prevNavActiveRef = useRef(navActive)
  useLayoutEffect(() => {
    const wasActive = prevNavActiveRef.current
    prevNavActiveRef.current = navActive
    if (wasActive && !navActive && navArmed) {
      focusNavDetailBar()
      return
    }
    if (navActive && paneFocus !== "terminal") {
      focusTerminalForNavControl()
    }
  }, [focusNavDetailBar, focusTerminalForNavControl, navActive, navArmed, paneFocus])

  useLayoutEffect(() => {
    if (promptPaneFocused) {
      if (skipNextPromptFocusRef.current) {
        skipNextPromptFocusRef.current = false
        return
      }
      focusPrompt()
      return
    }
    closePromptPickerUi()
    imeRef.current?.blur()
  }, [closePromptPickerUi, promptPaneFocused, focusPrompt])

  useEffect(() => {
    if (!promptPaneFocused) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [promptPaneFocused, focusPrompt])

  const promptLine = useCallback(
    () => imeRef.current?.value ?? lineRef.current,
    []
  )

  const {
    onSettingPickerStateChange,
    onSettingPickerRowAction,
    onSettingPickerApplyEdit,
    onSettingPickerEditInvalid
  } = useSettingPickerShell({
    sessionId,
    uiLocale: uiSettings.locale,
    uiCopy,
    appendLogLines,
    replaceUiSettingsState,
    closeSettingPickerColumn,
    setSettingListPicker,
    settingListPickerRef
  })

  const { submitLine } = useCommandDispatch({
    sessionId,
    mode,
    iSearchMatches,
    iSearchCycle,
    iSearchSnapshot,
    sessionListRows,
    uiCopy,
    uiSettings,
    navArmedRef,
    navActiveRef,
    navPositionsRef,
    jobRunner,
    tabPickerRef,
    searchListPickerRef,
    domListPickerRef,
    settingListPickerRef,
    tabsPageActiveModeRef,
    translatePairIdRef,
    promptLine,
    allowEmptyFirstPickerSyncRef,
    imeTokenPickerDismissedRef,
    tabPressSeqRef,
    lineRef,
    sessionListPickerDismissedRef,
    sessionNameTypingRef,
    sessionListPickerHiRef,
    setTabsPageActiveMode,
    switchSessionFromListPicker,
    setMode,
    setLine,
    setCursorPos,
    setISearchCycle,
    setHistNavIndex,
    focusPrompt,
    appendCommandToHistory,
    appendLogLines,
    setModeToolbarOrder,
    setNavArmed,
    setNavActive,
    setTranslateEnabled,
    setTranslatePairId,
    resetNavTranslateSession,
    activatePaneFocus,
    teardownNav,
    clearSearchLoadingProgress,
    closeSettingPickerColumn,
    setTabPicker,
    setSearchListPicker,
    setDomListPicker,
    setSettingListPicker,
    setSubCmdPicker,
    runDomListAndShow,
    runSearchListSearch,
    syncImeTokenPicker,
    openSessionNameTyping,
    saveSessionDisplayName,
    onActivateSession
  })

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
        paneFocusRef.current === "search" &&
        searchListPickerRef.current?.phase === "loading" &&
        isJobHandleActive(jobRunner.getActive("search-list"))
      ) {
        e.preventDefault()
        cancelSearchPageScan()
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
        tabPickerOpen: Boolean(tabPickerRef.current),
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
      cancelSearchPageScan,
      syncImeTokenPicker,
      tabPicker,
      sessionId,
      sidePickerOpen,
      isFocusedPane,
      navArmed,
      navKeyboardEnabled,
      navPageTyping,
      navTypingMode,
      navTypingMultiline,
      applyNavTypingMutation,
      navMenuOpen,
      navTextSelPicking,
      navTextSelDone,
      navTextSelPhase,
      closeSessionNameTyping,
      closeSessionNameTyping,
      closeSessionListPicker,
      focusPrompt,
      openSessionNameTyping,
      saveSessionDisplayName,
      applySessionSwitchPick,
    switchSessionFromListPicker,
      paneFocus,
      handleToggleNavActive,
      promptPaneFocused
    ]
  )

  /** EN: Controlled `value` fights browser/IME inserts during nav page-field typing. */
  const navPromptValueControlled = !navPageTyping
  const showNavTypingPlaceholder =
    navPageTyping && line.trim() === "" && !isComposing
  const showSessionNameTypingPlaceholder = sessionNameTyping && !isComposing
  const mirror = promptMirrorSegments(line, cursorPos, isComposing, compositionAnchor)
  const iSearchPreview = iSearchMatches[iSearchCycle]
  const shellScrollClassName = `bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`

  const shellContent = (
    <>
        {lines.length === 0 || postUpgradeBanner ? (
          <div className="bmxt-hint">
            {uiCopy.t("shell.welcome")}
            <br />
            <br />
            {uiCopy.t("shell.helpHint")}
          </div>
        ) : null}
        {postUpgradeBanner ? (
          <div className="bmxt-version-upgrade">
            <div className="bmxt-version-upgrade-title">
              {versionUpgradeTitle(uiCopy.locale, postUpgradeBanner.version)}
            </div>
            <div className="bmxt-version-upgrade-notes">
              {formatBulletedLines(postUpgradeBanner, uiCopy.locale).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ) : null}
        {lines.length > 0 ? <TerminalLogLines lines={lines} /> : null}
        {mode === "isearch" ? (
          <div className="bmxt-isearch">
            <span className="bmxt-isearch-label">(reverse-i-search)&apos;</span>
            <span className="bmxt-isearch-query">{line}</span>
            <span className="bmxt-isearch-label">&apos;: </span>
            <span className="bmxt-isearch-match">
              {iSearchMatches.length === 0
                ? "(no match)"
                : iSearchPreview ?? "(no match)"}
            </span>
            <span className="bmxt-isearch-hint">
              {" "}
              Ctrl+R older · ↑ newer · ↓ older · Enter · Esc
            </span>
          </div>
        ) : null}
        <PromptInput
          mode={mode}
          line={line}
          cursorPos={cursorPos}
          isComposing={isComposing}
          promptPaneFocused={promptPaneFocused}
          navPageTyping={navPageTyping}
          navTypingMultiline={navTypingMultiline}
          sessionNameTyping={sessionNameTyping}
          showSearchListPatternPlaceholder={showSearchListPatternPlaceholder}
          mirror={mirror}
          uiCopy={uiCopy}
          imeRef={imeRef}
          cursorMirrorCellRef={cursorMirrorCellRef}
          subCmdPickerHostRef={subCmdPickerHostRef}
          promptPickerOpen={promptPickerOpen}
          promptPickerScopeId={promptPickerScopeId}
          subCmdPickerScopeId={subCmdPickerScopeId}
          subCmdPicker={subCmdPicker}
          sessionListPickerHi={sessionListPickerHi}
          sessionListPickerRows={sessionListPickerRows}
          sessionPickerVariant={sessionPickerVariant}
          onImeInput={onImeInput}
          onBeforeInput={onBeforeInput}
          onImeSelect={onImeSelect}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onCompositionStart={onCompositionStart}
          onCompositionUpdate={onCompositionUpdate}
          onCompositionEnd={onCompositionEnd}
        />
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
        <ModeStatusBarStack
          order={modeToolbarOrder}
          focusedDetailBarId={detailBarId}
          detailBarFocusActive={paneFocus === "detailBar"}
          nav={{
            armed: navArmed,
            active: navActive,
            typingMode: navPageTyping,
            typingMultiline: navTypingMultiline,
            menuOpen: navMenuOpen,
            textSelPhase: navTextSelPhase,
            tabTitle: navCurrentTabTitle,
            overlayError: navOverlayError
          }}
          translate={{
            pairId: translatePairId,
            enabled: translateEnabled,
            navTypingAssist: navPageTyping && translateEnabled,
            navTypingMultiline: navTypingMultiline,
            busy: navTranslateBusy,
            statusNote: navTranslateStatus
          }}
          tabs={{
            pickerOpen: tabPicker !== null,
            pageActiveMode: tabsPageActiveMode
          }}
          search={{
            pickerOpen: searchListPicker !== null,
            pattern: searchListPicker?.pattern,
            phase: searchListPicker?.phase,
            pageActiveMode: searchPageActiveMode
          }}
          dom={{
            pickerOpen: domListPicker !== null,
            kind: domListPicker?.kind === "prompt" ? "prompt" : "lines"
          }}
          setting={{
            pickerOpen: settingListPicker !== null
          }}
        />
        <div className="bmxt-scroll-anchor" aria-hidden />
    </>
  )

  return (
    <div className="bmxt-shell-root">
      <div
        className="bmxt-terminal-split"
        data-bmxt-session-id={sessionId}
        data-bmxt-leaf-focused={isFocusedPane ? "" : undefined}>
        <div
          className={`bmxt-split-terminal-pane${promptPaneFocused ? " bmxt-split-pane--focused" : ""}`}>
          <div ref={scrollRef} className={shellScrollClassName}>
            {shellContent}
          </div>
        </div>
        <PickerRail
          railPickers={railPickers}
          railExpanded={railExpanded}
          columnOrder={pickerColumnOrder}
          pulseSlot={pickerPulseSlot}
          sessionId={sessionId}
          isFocusedPane={isFocusedPane}
          paneFocus={paneFocus}
          activatePaneFocus={activatePaneFocus}
          onExitToDetailBar={exitPickerToDetailBar}
          onCancelSearchInFlight={cancelSearchPageScan}
          tabPicker={displayTabPicker}
          searchListPicker={displaySearchListPicker}
          searchLoadingProgressLines={searchLoadingProgressLines}
          domListPicker={displayDomListPicker}
          settingListPicker={displaySettingListPicker}
          tabsPickerKeyboardActive={tabsPickerKeyboardActive}
          searchPickerKeyboardActive={searchPickerKeyboardActive}
          domPickerKeyboardActive={domPickerKeyboardActive}
          settingPickerKeyboardActive={settingPickerKeyboardActive}
          tabPickerInputRef={tabPickerInputRef}
          searchPickerInputRef={searchPickerInputRef}
          domPickerInputRef={domPickerInputRef}
          settingPickerInputRef={settingPickerInputRef}
          onSettingPickerStateChange={onSettingPickerStateChange}
          onSettingPickerRowAction={onSettingPickerRowAction}
          onSettingPickerApplyEdit={onSettingPickerApplyEdit}
          onSettingPickerEditInvalid={onSettingPickerEditInvalid}
          onAppendLog={appendLogLines}
          onRefreshTabPickerRows={refreshTabPickerRows}
          scheduleRefreshTabPickerRows={scheduleTabPickerRowsRefresh}
          onOpenSearchEntry={(entry, matchIndex, destination) =>
            void onOpenSearchPickerEntry(entry, matchIndex, destination)
          }
          onDomApprove={() => {
            if (domListPicker?.kind !== "prompt") {
              return
            }
            const cl = domListPicker.commandLine
            setDomListPicker(sessionId, {
              kind: "lines",
              lines: ["dom -list — retrying after permission grant…"],
              commandLine: cl
            })
            void runDomListAndShow(cl, cl, false)
          }}
          onTabsPickerFocusTabId={onTabsPickerFocusTabId}
          tabsPageActiveMode={tabsPageActiveMode}
          searchPageActiveMode={searchPageActiveMode}
        />
      </div>
    </div>
  )
}
