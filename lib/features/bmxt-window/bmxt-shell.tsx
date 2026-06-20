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
  resolveSessionRowByDisplayName,
  buildSessionSwitchCommandLine,
  filterSessionSwitchPickerRows,
  sanitizeSessionName,
  sessionSwitchCommandName,
  resolveSessionSwitchPickerState,
  SessionListCandidatePanel,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../session"
import { continuationPromptAfterLoneFirstToken } from "../builtin-commands/command-subcommands.gen"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../command-line"
import {
  buildTabPickerRows,
  listTabsMoveUrlCandidates,
  loadTabsPickerSettings,
  parseGroupNewInteractiveLine,
  parseTabsExitListLine,
  parseTabsListPickerLine,
  parseTabsSettingCommandLine,
  resolveInitialTabPickerHighlightIndex,
  saveTabsPageActiveMode,
  settingTokenForPageActiveMode,
  TABS_PAGE_ACTIVE_MODE_TOKENS,
  tabsMoveUrlCompletionZone,
  type TabPickerRow,
  type TabsPageActiveMode,
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../tabs"
import { openSearchPickerEntry } from "../search/open-search-picker-entry"
import {
  loadSearchPickerSettings,
  saveSearchPageActiveMode,
  type SearchPageActiveMode
} from "../search/page-active-setting"
import type { SearchOpenDestinationRow } from "../search/search-open-destination"
import {
  openPickerSlots,
  pickerEntriesFromSearchLines,
  usePickerRailPresence,
  type PickerEntry,
  type PickerSlotId,
  type SessionPickerState,
  type SessionPickersByLeaf
} from "../side-picker"
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
import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  normalizeSearchListDispatchLine,
  parseSearchExitListLine,
  parseSearchListPickerLine,
  searchListPatternFromLine,
  shouldShowSearchListPatternPlaceholder,
  type SearchListPickerState
} from "../search/search-list-picker-input"
import { enrichSearchPickerEntriesFromOpenTabs } from "../search/enrich-search-entries-from-tabs"
import { useBatchedSearchLoadingProgress } from "../search/use-batched-search-loading-progress"
import { resetSearchCacheFromSettings } from "../search/cache/search-cache-store"
import {
  isJobHandleActive,
  mergeJobIntoDispatchContext,
  shouldCancelJob,
  useSessionJobRunner
} from "../job"
import { normalizeSearchPattern } from "../search/search-format"
import {
  isRetryableDomListOutput,
  parseDomExitListLine,
  parseDomListPickerLine,
  type DomListPickerState
} from "../dom/dom-list-picker-input"
import type { DomListCapture } from "../dom/dom-list-capture"
import { resolveDomListTargetTabId as resolveDomListTargetTabIdFromSources } from "../dom/resolve-dom-list-target-tab"
import { useDomListFollowTab } from "../dom/use-dom-list-follow-tab"
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
import { buildHelpLines } from "../bmxt-core/registry/help"
import {
  bgImportErrorLine,
  createSettingListPickerState,
  exportUiSettingsZip,
  fontSizeFromPickerIndex,
  importUiSettingsZipFromFilePicker,
  importBackgroundImageFromFilePicker,
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine,
  replaceUiSettings,
  settingPickerApplyDraftToMain,
  settingPickerGoToView,
  settingPickerUpdateDraft,
  settingTokenForUiLocale,
  setRunLocale,
  t,
  formatBulletedLines,
  translateOnLogLine,
  versionUpgradeTitle,
  useUiCopy,
  useUiSettings,
  type SettingEditField,
  type SettingListPickerState,
  type SettingPickerRow
} from "../setting"
import { searchPageProgressLabel } from "../search/sources/page-progress"
import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts"
import { logBmxtKey } from "../debug/key-log"
import { matchesForSearch } from "./text-utils"
import {
  applyChromeEffects,
  type DispatchChromeContext
} from "../dispatch"
import type { ChromeEffect } from "../dispatch/effect-types"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates,
  runDispatch
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

export type { TabPickerState } from "../side-picker/session/tab-picker-state"
import type { TabPickerState } from "../side-picker/session/tab-picker-state"
import { BmxtTerminalScrollPane } from "./shell/bmxt-terminal-scroll-pane"
import { LazyPickerRail } from "./shell/lazy-picker-rail"
import {
  BmxtPromptPane,
  type BmxtPromptHandle,
  type PromptShellBridge,
  type PromptBlockedFlags,
  type NavTranslateMeta
} from "./prompt"

function effectsIncludeSearchPage(effects: ChromeEffect[]): boolean {
  return effects.some((e) => e.kind === "search_page")
}

function measureFloatingPickerHostPosition(
  cell: HTMLElement | null,
  host: HTMLElement | null
): { left: number; top: number } | null {
  if (!cell) {
    return null
  }
  const cr = cell.getBoundingClientRect()
  const gap = 2
  const hostW = host?.offsetWidth ?? 260
  const hostH = host?.offsetHeight ?? 140
  let left = cr.right + gap
  const maxLeft = window.innerWidth - hostW - 8
  if (left > maxLeft) {
    left = Math.max(8, maxLeft)
  } else {
    left = Math.max(8, left)
  }
  let top = cr.bottom + gap
  if (top + hostH > window.innerHeight - 8 && cr.top - gap - hostH >= 8) {
    top = cr.top - gap - hostH
  }
  if (top + hostH > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - hostH - 8)
  } else {
    top = Math.max(8, top)
  }
  return { left, top }
}

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
  const tabPicker = sessionPickers.tabs
  const searchListPicker = sessionPickers.search
  const domListPicker = sessionPickers.dom
  const settingListPicker = sessionPickers.setting
  const setTabPicker = useCallback(
    (forSessionId: string, v: TabPickerState | null | ((prev: TabPickerState | null) => TabPickerState | null)) => {
      setSessionPickerSlot(forSessionId, "tabs", v)
    },
    [setSessionPickerSlot]
  )
  const setSearchListPicker = useCallback(
    (forSessionId: string, v: SearchListPickerState | null | ((prev: SearchListPickerState | null) => SearchListPickerState | null)) => {
      setSessionPickerSlot(forSessionId, "search", v)
    },
    [setSessionPickerSlot]
  )
  const setDomListPicker = useCallback(
    (forSessionId: string, v: DomListPickerState | null | ((prev: DomListPickerState | null) => DomListPickerState | null)) => {
      setSessionPickerSlot(forSessionId, "dom", v)
    },
    [setSessionPickerSlot]
  )
  const setSettingListPicker = useCallback(
    (forSessionId: string, v: SettingListPickerState | null | ((prev: SettingListPickerState | null) => SettingListPickerState | null)) => {
      setSessionPickerSlot(forSessionId, "setting", v)
    },
    [setSessionPickerSlot]
  )
  /** tabs / search / dom / setting — 左ターミナル・右にピッカー列（複数可）。 */
  const sidePickerOpen =
    tabPicker !== null ||
    searchListPicker !== null ||
    domListPicker !== null ||
    settingListPicker !== null
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
  const {
    lines: searchLoadingProgressLines,
    reset: resetSearchLoadingProgress,
    append: appendSearchLoadingProgress,
    clear: clearSearchLoadingProgress
  } = useBatchedSearchLoadingProgress()
  const tabsPickerFocusTabIdRef = useRef<number | null>(null)
  const tabPickerOpenRef = useRef(false)
  useEffect(() => {
    tabPickerOpenRef.current = tabPicker !== null
  }, [tabPicker])
  useEffect(() => {
    if (tabPicker === null) {
      tabsPickerFocusTabIdRef.current = null
    }
  }, [tabPicker])

  const resolveDomListTargetTabId = useCallback(async (): Promise<number | undefined> => {
    return resolveDomListTargetTabIdFromSources(
      tabsPickerFocusTabIdRef.current,
      tabPickerOpenRef.current
    )
  }, [])
  const [navActive, setNavActive] = useState(false)
  const [translateEnabled, setTranslateEnabled] = useState(false)
  const [translatePairId, setTranslatePairId] = useState<TranslationPairId>(
    DEFAULT_TRANSLATION_PAIR_ID
  )
  const translateEnabledRef = useRef(false)
  const translatePairIdRef = useRef<TranslationPairId>(DEFAULT_TRANSLATION_PAIR_ID)
  const [tabsPageActiveMode, setTabsPageActiveMode] = useState<TabsPageActiveMode>("auto")
  const tabsPageActiveModeRef = useRef<TabsPageActiveMode>("auto")
  const [searchPageActiveMode, setSearchPageActiveMode] = useState<SearchPageActiveMode>("auto")
  const searchPageActiveModeRef = useRef<SearchPageActiveMode>("auto")
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
    getTypingBuffer: () => promptRef.current?.getLine() ?? "",
    resolveTypingCommitText: async () =>
      promptRef.current?.resolveTypingCommitText() ?? "",
    uiLocale: uiSettings.locale
  })

  const navTextSelDone = navTextSelPhase === "done"

  const promptRef = useRef<BmxtPromptHandle | null>(null)
  const bridgeRef = useRef<PromptShellBridge>(null!)
  const [promptBlockedFlags, setPromptBlockedFlags] = useState<PromptBlockedFlags>({
    sessionNameTyping: false,
    mode: "normal",
    subCmdPickerOpen: false,
    sessionListPickerOpen: false
  })
  const [navTranslateMeta, setNavTranslateMeta] = useState<NavTranslateMeta>({
    busy: false,
    statusNote: null
  })

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

  useEffect(() => {
    if (paneFocus === "detailBar" && detailBarId === null) {
      const fallback = modeToolbarOrder[modeToolbarOrder.length - 1] ?? null
      if (fallback !== null) {
        setDetailBarId(fallback)
        return
      }
      onPaneFocusChange("terminal")
      return
    }
    if (paneFocus === "tabs" && tabPicker === null) {
      onPaneFocusChange("terminal")
      setDetailBarId(null)
    } else if (paneFocus === "search" && searchListPicker === null) {
      onPaneFocusChange("terminal")
      setDetailBarId(null)
    } else if (paneFocus === "dom" && domListPicker === null) {
      onPaneFocusChange("terminal")
      setDetailBarId(null)
    } else if (paneFocus === "setting" && settingListPicker === null) {
      onPaneFocusChange("terminal")
      setDetailBarId(null)
    } else if (paneFocus === "detailBar" && detailBarId !== null) {
      if (detailBarId === "tabs" && tabPicker === null) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      } else if (detailBarId === "search" && searchListPicker === null) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      } else if (detailBarId === "dom" && domListPicker === null) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      } else if (detailBarId === "setting" && settingListPicker === null) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      } else if (detailBarId === "nav" && !navArmed) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      } else if (detailBarId === "translate" && !translateEnabled) {
        onPaneFocusChange("terminal")
        setDetailBarId(null)
      }
    }
  }, [
    detailBarId,
    domListPicker,
    modeToolbarOrder,
    navArmed,
    onPaneFocusChange,
    paneFocus,
    searchListPicker,
    setDetailBarId,
    settingListPicker,
    tabPicker,
    translateEnabled
  ])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [logScrollable, setLogScrollable] = useState(false)

  const syncLogScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const needs = el.scrollHeight > el.clientHeight + 1
    setLogScrollable(needs)
  }, [])

  useLayoutEffect(() => {
    syncLogScroll()
  }, [lines, syncLogScroll, postUpgradeBanner])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => syncLogScroll())
    ro.observe(el)
    return () => ro.disconnect()
  }, [syncLogScroll])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [lines, syncLogScroll, postUpgradeBanner])

  const focusPrompt = useCallback(() => {
    promptRef.current?.focus()
  }, [])

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
        promptRef.current?.blur()
      } else {
        focusPickerSlot(target)
      }
    },
    [focusPickerSlot, focusPrompt, onPaneFocusChange]
  )

  const activateDetailBar = useCallback(
    (id: DetailBarId) => {
      promptRef.current?.closePromptPickerUi()
      setDetailBarId(id)
      onPaneFocusChange("detailBar")
      promptRef.current?.blur()
      if (isPickerDetailBar(id)) {
        pulsePickerColumn(detailBarToPickerSlot(id))
      }
    },
    [onPaneFocusChange, pulsePickerColumn, setDetailBarId]
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
    const end = promptRef.current?.getLine().length ?? 0
    promptRef.current?.setCursorPos(end)
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
        promptRef.current?.resetNavTranslateSession()
      })()
    },
    []
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
    blocked:
      navPageTyping ||
      promptBlockedFlags.sessionNameTyping ||
      promptBlockedFlags.mode === "isearch" ||
      promptBlockedFlags.subCmdPickerOpen ||
      promptBlockedFlags.sessionListPickerOpen,
    isCaretAtPromptEnd: () => promptRef.current?.isCaretAtPromptEnd() ?? true,
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
    promptRef.current?.closePromptPickerUi()
    promptRef.current?.blur()
  }, [promptPaneFocused, focusPrompt])

  useEffect(() => {
    if (!promptPaneFocused) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [promptPaneFocused, focusPrompt])
  const runDomListAndShow = useCallback(
    async (
      domListLine: string,
      displayLine: string,
      announce: boolean
    ): Promise<void> => {
      await jobRunner.start(
        "dom-list",
        async (job) => {
          try {
            await ensureBmxtCore()
            const bundle = runDispatch(domListLine, uiSettings.locale)
            if (shouldCancelJob(job)) {
              return
            }
            if (bundle.ty === "lines") {
              await appendLogLines([`> ${displayLine}`, ...(bundle.lines ?? [])])
              setDomListPicker(sessionId, null)
              return
            }
            let domCapture: DomListCapture | undefined
            const ctx = mergeJobIntoDispatchContext(
              {
                clearLog: async () => {},
                exitPane: async () => [],
                listWindows: async () => [],
                focusInfo: async () => [],
                resolveTabArg: async () => undefined,
                resolveDomListTargetTabId,
                onDomListCapture: (capture) => {
                  domCapture = capture
                },
                commandSessionId: sessionId,
                uiLocale: uiSettings.locale
              },
              job
            )
            const linesOut = await applyChromeEffects(ctx, bundle.effects ?? [])
            if (shouldCancelJob(job)) {
              return
            }
            if (isRetryableDomListOutput(linesOut)) {
              if (announce) {
                await appendLogLines([
                  `> ${displayLine}`,
                  uiCopy.t("domPrompt.headline")
                ])
              }
              setDomListPicker(sessionId, {
                kind: "prompt",
                message: linesOut,
                commandLine: domListLine
              })
              setModeToolbarOrder((prev) => activateModeToolbar(prev, "dom"))
              return
            }
            if (announce) {
              await appendLogLines([`> ${displayLine}`, uiCopy.t("dom.listPicker")])
            }
            const targetTabId = await resolveDomListTargetTabId()
            setDomListPicker(sessionId, {
              kind: "lines",
              lines: linesOut,
              commandLine: domListLine,
              targetTabId,
              jumpPaths: domCapture?.jumpPaths ?? linesOut.map(() => null),
              headerLineCount: domCapture?.headerLineCount ?? linesOut.length
            })
            setModeToolbarOrder((prev) => activateModeToolbar(prev, "dom"))
          } catch (e) {
            if (shouldCancelJob(job)) {
              return
            }
            await appendLogLines([
              `> ${displayLine}`,
              uiCopy.t("error.generic", {
                message: e instanceof Error ? e.message : String(e)
              })
            ])
            setDomListPicker(sessionId, null)
          }
        },
        { meta: { line: domListLine }, persist: false }
      )
    },
    [
      appendLogLines,
      jobRunner,
      sessionId,
      setDomListPicker,
      setModeToolbarOrder,
      resolveDomListTargetTabId,
      uiCopy,
      uiSettings.locale
    ]
  )

  const refreshDomListPicker = useCallback(
    (commandLine: string) => runDomListAndShow(commandLine, commandLine, false),
    [runDomListAndShow]
  )

  const { onTabsPickerFocusTabId: queueDomListFollowRefresh } = useDomListFollowTab({
    domListPicker,
    resolveTargetTabId: resolveDomListTargetTabId,
    refreshDomList: refreshDomListPicker,
    isDomListJobActive: () => jobRunner.isActive("dom-list")
  })

  const onTabsPickerFocusTabId = useCallback(
    (tabId: number | null) => {
      tabsPickerFocusTabIdRef.current = tabId
      queueDomListFollowRefresh(tabId)
    },
    [queueDomListFollowRefresh]
  )

  const runSearchListSearch = useCallback(
    async (_displayLine: string, searchListLine: string) => {
      promptRef.current?.closePromptPickerUi()

      const dispatchLine = normalizeSearchListDispatchLine(searchListLine)
      const progressLabel = searchPageProgressLabel(dispatchLine)
      const initialProgress = [`${progressLabel} — searching…`]
      const searchPattern = normalizeSearchPattern(searchListPatternFromLine(dispatchLine))

      resetSearchLoadingProgress(initialProgress)
      setSearchListPicker(sessionId, {
        phase: "loading",
        progressLines: [],
        entries: [],
        pattern: searchPattern
      })
      setModeToolbarOrder((prev) => activateModeToolbar(prev, "search"))

      await jobRunner.start(
        "search-list",
        async (job) => {
          try {
            await ensureBmxtCore()
            if (shouldCancelJob(job)) {
              return
            }
            await appendLogLines([`> ${dispatchLine}`])
            const bundle = runDispatch(dispatchLine, uiSettings.locale)
            if (shouldCancelJob(job)) {
              return
            }
            if (bundle.ty === "lines") {
              clearSearchLoadingProgress()
              setSearchListPicker(sessionId, null)
              await appendLogLines(bundle.lines ?? [])
              return
            }
            const effects = bundle.effects ?? []
            if (effectsIncludeSearchPage(effects) && !shouldCancelJob(job)) {
              appendSearchLoadingProgress(uiCopy.t("search.pageScanHint"))
            }
            const ctx = mergeJobIntoDispatchContext(
              {
                clearLog: async () => {},
                exitPane: async () => [],
                listWindows: async () => [],
                focusInfo: async () => [],
                resolveTabArg: async () => undefined,
                commandSessionId: sessionId,
                uiLocale: uiSettings.locale
              },
              job,
              {
                searchPageProgressLabel: progressLabel,
                onSearchPageProgress: async (message) => {
                  if (!shouldCancelJob(job)) {
                    appendSearchLoadingProgress(message)
                  }
                }
              }
            )
            const linesOut = await applyChromeEffects(ctx, effects)
            if (shouldCancelJob(job)) {
              clearSearchLoadingProgress()
              if (linesOut.length > 0) {
                await appendLogLines(linesOut)
              }
              return
            }
            const parsed = pickerEntriesFromSearchLines(linesOut)
            const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, searchPattern)
            if (shouldCancelJob(job)) {
              clearSearchLoadingProgress()
              return
            }
            clearSearchLoadingProgress()
            const emptyResultLines =
              entries.length === 0 ? linesOut.filter((l) => l.trim().length > 0) : undefined
            setSearchListPicker(sessionId, {
              phase: "results",
              progressLines: [],
              entries,
              pattern: searchPattern,
              emptyResultLines
            })
          } catch (e) {
            clearSearchLoadingProgress()
            if (!shouldCancelJob(job)) {
              setSearchListPicker(sessionId, null)
              await appendLogLines([
                uiCopy.t("error.generic", {
                  message: e instanceof Error ? e.message : String(e)
                })
              ])
            }
          }
        },
        { meta: { line: dispatchLine }, persist: false }
      )
    },
    [
      appendLogLines,
      appendSearchLoadingProgress,
      clearSearchLoadingProgress,
      jobRunner,
      resetSearchLoadingProgress,
      sessionId,
      setSearchListPicker,
      uiCopy,
      uiSettings.locale
    ]
  )

  const cancelSearchPageScan = useCallback(() => {
    const job = jobRunner.getActive("search-list")
    if (!isJobHandleActive(job)) {
      return
    }
    jobRunner.cancelHandle(job)
    clearSearchLoadingProgress()
    void appendLogLines([
      uiCopy.t("search.cancelledCtrlC"),
      uiCopy.t("search.pageScanCancelled")
    ])
  }, [appendLogLines, clearSearchLoadingProgress, jobRunner, uiCopy])

  const onSettingPickerStateChange = useCallback(
    (next: SettingListPickerState) => {
      setSettingListPicker(sessionId, next)
    },
    [sessionId, setSettingListPicker]
  )

  const onSettingPickerRowAction = useCallback(
    async (row: SettingPickerRow, index: number) => {
      const logPrefix = "setting -list"
      const current = settingListPickerRef.current
      if (!current) {
        return
      }
      if (row.id === "save") {
        const draft = current.draft
        await replaceUiSettings(draft)
        replaceUiSettingsState(draft)
        closeSettingPickerColumn()
        await appendLogLines([logPrefix, uiCopy.t("setting.picker.saved")])
        return
      }
      if (row.id === "cancel") {
        closeSettingPickerColumn()
        await appendLogLines([logPrefix, uiCopy.t("setting.picker.cancelled")])
        return
      }
      if (row.id === "locale-ja" || row.id === "locale-en") {
        const locale = row.id === "locale-ja" ? "ja" : "en"
        setSettingListPicker(
          sessionId,
          settingPickerApplyDraftToMain(current, { locale })
        )
        return
      }
      if (row.id === "edit-picker-on") {
        setSettingListPicker(
          sessionId,
          settingPickerApplyDraftToMain(current, { editPicker: true })
        )
        return
      }
      if (row.id === "edit-picker-off") {
        setSettingListPicker(
          sessionId,
          settingPickerApplyDraftToMain(current, { editPicker: false })
        )
        return
      }
      if (row.id === "reset-yes") {
        setSettingListPicker(
          sessionId,
          settingPickerApplyDraftToMain(current, {
            editPicker: false,
            appearance: {
              fg: null,
              bgColor: null,
              fontSize: null,
              fontFamily: null,
              bgImageDataUrl: null
            },
            picker: {
              fg: null,
              bgColor: null,
              fontSize: null,
              fontFamily: null,
              bgImageDataUrl: null
            }
          })
        )
        return
      }
      if (row.id === "reset-no") {
        return
      }
      if (row.id === "search-cache-reset-yes") {
        try {
          await resetSearchCacheFromSettings()
          setSettingListPicker(sessionId, settingPickerGoToView("main", current))
          await appendLogLines([logPrefix, uiCopy.t("setting.searchCache.resetDone")])
        } catch (e) {
          await appendLogLines([
            logPrefix,
            uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
        return
      }
      if (row.id === "search-cache-reset-no") {
        return
      }
      if (row.id === "size") {
        const fontSize = fontSizeFromPickerIndex(index)
        if (fontSize === null) {
          return
        }
        const patch =
          current.view === "pickerFontSize"
            ? { picker: { fontSize } }
            : { appearance: { fontSize } }
        setSettingListPicker(sessionId, settingPickerApplyDraftToMain(current, patch))
        return
      }
      if (row.id === "bg-import") {
        const result = await importBackgroundImageFromFilePicker()
        if (result.ok === false) {
          if (result.cancelled) {
            await appendLogLines([logPrefix, uiCopy.t("setting.bgImport.cancelled")])
          } else {
            await appendLogLines([logPrefix, bgImportErrorLine(uiSettings.locale, result)])
          }
          return
        }
        const afterImport = settingListPickerRef.current ?? current
        const bgPatch =
          afterImport.view === "pickerBgImage"
            ? { picker: { bgImageDataUrl: result.dataUrl } }
            : { appearance: { bgImageDataUrl: result.dataUrl } }
        setSettingListPicker(
          sessionId,
          settingPickerApplyDraftToMain(afterImport, bgPatch)
        )
        return
      }
      if (row.id === "bg-clear") {
        const bgPatch =
          current.view === "pickerBgImage"
            ? { picker: { bgImageDataUrl: null } }
            : { appearance: { bgImageDataUrl: null } }
        setSettingListPicker(sessionId, settingPickerApplyDraftToMain(current, bgPatch))
        return
      }
      if (row.id === "export") {
        try {
          const { filename } = await exportUiSettingsZip(current.draft)
          await appendLogLines([logPrefix, uiCopy.t("setting.export.done", { filename })])
        } catch (e) {
          await appendLogLines([
            logPrefix,
            uiCopy.t("error.generic", {
              message: e instanceof Error ? e.message : String(e)
            })
          ])
        }
        return
      }
      if (row.id === "import") {
        const result = await importUiSettingsZipFromFilePicker()
        if (result.ok === false) {
          if ("cancelled" in result && result.cancelled) {
            await appendLogLines([logPrefix, uiCopy.t("setting.import.cancelled")])
            return
          }
          await appendLogLines([
            logPrefix,
            uiCopy.t("setting.import.failed", {
              message: "error" in result ? result.error : "unknown error"
            })
          ])
          return
        }
        const afterImport = settingListPickerRef.current ?? current
        setSettingListPicker(sessionId, {
          ...afterImport,
          view: "main",
          editing: false,
          editDraft: "",
          draft: result.settings
        })
        await appendLogLines([logPrefix, uiCopy.t("setting.picker.importDraft")])
      }
    },
    [
      appendLogLines,
      closeSettingPickerColumn,
      replaceUiSettingsState,
      uiCopy
    ]
  )

  const onSettingPickerApplyEdit = useCallback(
    async (field: SettingEditField, value: string) => {
      setSettingListPicker(sessionId, (current) => {
        if (!current) {
          return null
        }
        const layerPatch =
          field === "fg" || field === "picker-fg"
            ? { fg: value }
            : field === "bg-color" || field === "picker-bg-color"
              ? { bgColor: value }
              : field === "search-hit-highlight"
                ? { searchHitHighlightBg: value }
                : field === "search-jump-highlight"
                  ? { searchJumpHighlightBg: value }
                  : { fontFamily: value }
        const draftPatch =
          field === "picker-fg" || field === "picker-bg-color" || field === "picker-font"
            ? { picker: layerPatch }
            : { appearance: layerPatch }
        return settingPickerApplyDraftToMain(current, draftPatch)
      })
    },
    [sessionId, setSettingListPicker]
  )

  const onSettingPickerEditInvalid = useCallback(async () => {
    await appendLogLines([
      "setting -list",
      uiCopy.t("setting.prompt.editInvalid")
    ])
  }, [appendLogLines, uiCopy])

  const onOpenSearchPickerEntry = useCallback(
    async (
      entry: PickerEntry,
      matchIndex: number,
      destination?: SearchOpenDestinationRow
    ) => {
      const pattern = searchListPickerRef.current?.pattern ?? ""
      const ctx: DispatchChromeContext = {
        clearLog: async () => {},
        exitPane: async () => [],
        listWindows: async () => [],
        focusInfo: async () => [],
        resolveTabArg: async () => undefined,
        commandSessionId: sessionId,
        uiLocale: uiSettings.locale
      }
      await openSearchPickerEntry(
        entry,
        matchIndex,
        ctx,
        (lines) => appendLogLines(lines),
        pattern,
        destination
      )
    },
    [appendLogLines, sessionId, uiSettings.locale]
  )
  const shellScrollClassName = `bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`

  bridgeRef.current = {
    sessionId,
    sessionListRows,
    currentSessionDisplayName,
    uiCopy,
    uiSettings,
    paneFocusRef,
    navPositionsRef,
    tabsPageActiveModeRef,
    translatePairIdRef,
    appendCommandToHistory,
    appendLogLines,
    onActivateSession,
    onSetSessionDisplayName,
    activatePaneFocus,
    closeSettingPickerColumn,
    runDomListAndShow,
    runSearchListSearch,
    cancelSearchPageScan,
    cancelSearchListJob: () => { jobRunner.cancel("search-list") },
    isSearchListJobActive: () => jobRunner.isActive("search-list"),
    isDomListJobActive: () => jobRunner.isActive("dom-list"),
    cancelDomListJob: () => { jobRunner.cancel("dom-list") },
    getTabPicker: () => tabPickerRef.current,
    getSearchListPicker: () => searchListPickerRef.current,
    getSettingListPicker: () => settingListPickerRef.current,
    getDomListPicker: () => domListPickerRef.current,
    getNavArmed: () => navArmedRef.current,
    getNavActive: () => navActiveRef.current,
    setTabPicker,
    setSearchListPicker,
    setSettingListPicker,
    setDomListPicker,
    setModeToolbarOrder,
    setNavArmed,
    setNavActive,
    teardownNav,
    clearSearchLoadingProgress,
    clearNavPositions: () => {
      navPositionsRef.current = {}
    },
    setTabsPageActiveMode: (mode: TabsPageActiveMode) => {
      setTabsPageActiveMode(mode)
      tabsPageActiveModeRef.current = mode
    },
    setTranslateEnabled,
    setTranslatePairId,
    onPromptBlockedChange: setPromptBlockedFlags,
    onNavTranslateMetaChange: setNavTranslateMeta
  }

  const shellContent = (
    <>
        <BmxtTerminalScrollPane lines={lines} postUpgradeBanner={postUpgradeBanner} uiCopy={uiCopy} />
        <BmxtPromptPane
          ref={promptRef}
          bridgeRef={bridgeRef}
          history={history}
          completionCandidates={completionCandidates}
          sessionListRows={sessionListRows}
          sessionId={sessionId}
          promptPaneFocused={promptPaneFocused}
          isFocusedPane={isFocusedPane}
          paneFocus={paneFocus}
          navPageTyping={navPageTyping}
          navTypingMultiline={navTypingMultiline}
          navKeyboardEnabled={navKeyboardEnabled}
          navTypingMode={navTypingMode}
          navMenuOpen={navMenuOpen}
          navTextSelPicking={navTextSelPicking}
          navTextSelDone={navTextSelDone}
          navArmed={navArmed}
          handleToggleNavActive={handleToggleNavActive}
          translateEnabled={translateEnabled}
          translatePairId={translatePairId}
          scrollRef={scrollRef}
          uiCopy={uiCopy}
        />
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
            busy: navTranslateMeta.busy,
            statusNote: navTranslateMeta.statusNote
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
        <LazyPickerRail
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
