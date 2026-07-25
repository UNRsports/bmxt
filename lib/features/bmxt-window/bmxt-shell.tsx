import { TerminalLogLines } from "./terminal-log-lines"
import {
  isSessionSettingNameUiLine,
  isSessionSwitchUiLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  parseSessionSwitchByNumberLine,
  resolveSessionDisplayName,
  sessionSwitchCommandName,
  SessionListCandidatePanel,
  type SessionListRow
} from "../session"
import {
  resolveInitialTabPickerHighlightIndex,
  type TabPickerRow
} from "../tabs/picker-rows"
import { parseGroupNewInteractiveLine, parseTabsExitListLine } from "../tabs/input"
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
import {
  loadDomPickerSettings,
  saveDomPageActiveMode,
  type DomPageActiveMode
} from "../dom/page-active-setting"
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
  type DetailBarId
} from "./detail-bar-focus"
import { PromptInput } from "./shell/PromptInput"
import { useCommandDispatch } from "./shell/useCommandDispatch"
import {
  deleteNavReloadTabBlockAtCursor,
  deleteNavReloadTabBlockForwardAtCursor,
  findNavReloadTabTokenSpans,
  type NavReloadTabChipMeta
} from "../nav/nav-reload-tab-token"
import { lockedPrefixBlocksDelete } from "./shell/prompt-locked-prefix"
import { rewriteHashTTokensInLogLines } from "../nav/nav-tab-ref-log-rewrite"
import { resolveTabFaviconSrc } from "../tabs/tab-favicon-url"
import { useLogScroll } from "./shell/useLogScroll"
import { usePromptTypingFocus } from "./shell/usePromptTypingFocus"
import { useSessionPromptActions } from "./shell/useSessionPromptActions"
import { useDomListShell } from "./shell/useDomListShell"
import { useSearchListShell } from "./shell/useSearchListShell"
import { useSnapshotSaveShell } from "./shell/useSnapshotSaveShell"
import { useSettingPickerShell } from "./shell/useSettingPickerShell"
import { usePromptPickers } from "./shell/usePromptPickers"
import { useNavPromptBridge } from "./shell/useNavPromptBridge"
import { usePaneFocusController } from "./shell/usePaneFocusController"
import { useShellKeyboard } from "./shell/useShellKeyboard"
import { useShellPromptCore } from "./shell/useShellPromptCore"
import { usePickerManager } from "./shell/usePickerManager"
import {
  parseSearchExitListLine,
  shouldShowSearchListPatternPlaceholder,
  type SearchListPickerState
} from "../search/search-list-picker-input"
import { isJobHandleActive, useSessionJobRunner } from "../job"
import { useCommandBusyIndicator } from "./shell/command-busy"
import { parseDomExitListLine, type DomListPickerState } from "../dom/dom-list-picker-input"
import { isDomListPickerFollowEnabled } from "../dom/dom-list-follow-enabled"
import {
  parseNavEnterLine,
  parseNavExitLine,
  useNavMode,
  type NavPositionsByTab
} from "../nav"
import { patchFloatBrowseStateForTab } from "../bmxt-float/float-browse-state-storage"
import { ModeStatusBarStack } from "./mode-status-bar-stack"
import {
  activateModeToolbar,
  deactivateModeToolbar,
  type ModeToolbarId
} from "./mode-toolbar-order"
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
import { tShell } from "../setting/i18n/ns/shell"
import { tSearch } from "../setting/i18n/ns/search"
import { tNav } from "../setting/i18n/ns/nav"
import { formatBulletedLines, versionUpgradeTitle } from "../setting/i18n/resolvers"
import { setRunLocale } from "../setting/i18n/run-locale"
import { settingTokenForUiLocale } from "../setting/locale"
import { type SettingListPickerState } from "../setting/setting-list-picker-state"
import {
  parseSettingExitListLine,
  parseSettingIncompleteLine
} from "../setting/setting-list-picker-input"
import { useUiSettings } from "../setting/use-ui-settings"
import { externalSettingsRecoveryLogLines } from "../setting/external-settings-startup"
import { useExternalSettingsRecovery } from "../setting/use-external-settings-recovery"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction
} from "react"
import type { PostUpgradeBanner } from "./use-version-upgrade-banner"

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
  onActivateSession: (sessionId: string) => void
  onSetSessionDisplayName: (sessionId: string, name: string) => void
  appendLogLines: (
    newLines: string[],
    channel?: import("../command-line/command-output.ts").LogChannel
  ) => void | Promise<void>
  sessionOrderLength: number
  /** EN: popup vs in-page float — drives `exit` host policy. */
  hostKind?: import("./bmxt-host-kind").BmxtHostKind
  /** EN: Hosting tab id when `hostKind` is float (browse-state persistence). */
  floatTabId?: number | null
  /** EN: Restored nav overlay ON after float remount. */
  restoredNavActive?: boolean
  processUiReady?: boolean
  /** EN: Float — flush sessions/browse before `close` removes the host tab. */
  flushFloatPersist?: () => Promise<void>
  applyRunCmdPatches: (patches: import("./terminal-sessions/session-patches").SessionPatch[]) => void
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
  /** EN: Log-area welcome/banner wait; prompt is not blocked on this. */
  upgradeBannerReady: boolean
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
  appendLogLines: appendLogLinesProp,
  sessionOrderLength,
  hostKind = "popup",
  floatTabId = null,
  restoredNavActive = false,
  processUiReady = true,
  flushFloatPersist: flushFloatPersistProp,
  applyRunCmdPatches,
  appendCommandToHistory,
  sessionPickers,
  setSessionPickerSlot,
  refreshTabPickerRows,
  scheduleTabPickerRowsRefresh,
  postUpgradeBanner,
  upgradeBannerReady,
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
  const navReloadTabMetaRef = useRef<Map<number, NavReloadTabChipMeta>>(new Map())
  const [navReloadTabMetaRev, setNavReloadTabMetaRev] = useState(0)
  const appendLogLines = useCallback(
    (
      newLines: string[],
      channel?: import("../command-line/command-output.ts").LogChannel
    ) => {
      const pendingTitle = tNav("nav.reload.chipPending", uiSettings.locale)
      const rewritten = rewriteHashTTokensInLogLines(
        newLines,
        navReloadTabMetaRef.current,
        pendingTitle
      )
      return appendLogLinesProp(rewritten, channel)
    },
    [appendLogLinesProp, uiSettings.locale]
  )
  const externalSettingsRecovery = useExternalSettingsRecovery()
  if (!externalSettingsRecovery) {
    throw new Error("ExternalSettingsRecoveryProvider is required")
  }
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
  const pickersForColumnOrder = railPickers
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
    isCommandBusy,
    showCommandBusy,
    commandBusyLabel,
    beginCommandBusy,
    updateCommandBusyMessage,
    updateCommandBusyProgress,
    endCommandBusy,
    isBusyTokenActive
  } = useCommandBusyIndicator()
  const isCommandBusyRef = useRef(false)
  useEffect(() => {
    isCommandBusyRef.current = isCommandBusy
  }, [isCommandBusy])

  const cancelCommandBusy = useCallback(() => {
    const hadSearch = isJobHandleActive(jobRunner.getActive("search-list"))
    const hadRunCmd = isJobHandleActive(jobRunner.getActive("run-cmd"))
    if (!hadSearch && !hadRunCmd && !isCommandBusyRef.current) {
      return
    }
    if (hadSearch) {
      jobRunner.cancel("search-list")
    }
    if (hadRunCmd) {
      jobRunner.cancel("run-cmd")
    }
    endCommandBusy()
    if (hadSearch) {
      void appendLogLines([tSearch("search.cancelledCtrlC", uiSettings.locale)])
    } else {
      void appendLogLines([tShell("shell.commandBusy.cancelled", uiSettings.locale)])
    }
  }, [appendLogLines, endCommandBusy, jobRunner, uiSettings.locale])

  const [navActive, setNavActive] = useState(false)
  const [navActivePersistReady, setNavActivePersistReady] = useState(hostKind !== "float")
  const floatNavActiveRestoredRef = useRef(false)
  useEffect(() => {
    if (hostKind !== "float") {
      return
    }
    if (!processUiReady) {
      // EN: Allow another restore after float re-hydrate (sessions → browse).
      floatNavActiveRestoredRef.current = false
      setNavActivePersistReady(false)
      return
    }
    if (floatNavActiveRestoredRef.current) {
      return
    }
    floatNavActiveRestoredRef.current = true
    if (restoredNavActive) {
      setNavActive(true)
    }
    // EN: Gate persist until restore applied — otherwise initial false wipes nav ON across remount.
    setNavActivePersistReady(true)
  }, [hostKind, processUiReady, restoredNavActive])

  useEffect(() => {
    if (hostKind !== "float" || floatTabId === null || !processUiReady || !navActivePersistReady) {
      return
    }
    void patchFloatBrowseStateForTab(floatTabId, { navActive })
  }, [floatTabId, hostKind, navActive, navActivePersistReady, processUiReady])

  const [translateEnabled, setTranslateEnabled] = useState(false)
  const [translatePairId, setTranslatePairId] = useState<TranslationPairId>(
    DEFAULT_TRANSLATION_PAIR_ID
  )
  const translatePairIdRef = useRef<TranslationPairId>(DEFAULT_TRANSLATION_PAIR_ID)
  const [tabsPageActiveMode, setTabsPageActiveMode] = useState<TabsPageActiveMode>("auto")
  const tabsPageActiveModeRef = useRef<TabsPageActiveMode>("auto")
  const [searchPageActiveMode, setSearchPageActiveMode] = useState<SearchPageActiveMode>("auto")
  const searchPageActiveModeRef = useRef<SearchPageActiveMode>("auto")
  const [domPageActiveMode, setDomPageActiveMode] = useState<DomPageActiveMode>("auto")
  const domPageActiveModeRef = useRef<DomPageActiveMode>("auto")
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

  const domListFollowEnabled = useMemo(
    () => isDomListPickerFollowEnabled(domListPicker, paneFocus, detailBarId),
    [detailBarId, domListPicker, paneFocus]
  )

  const {
    runDomListAndShow,
    onTabsPickerFocusTabId,
    syncTabPickerOpen,
    clearTabsPickerFocusTabId,
    refreshDomViewportForPicker
  } = useDomListShell({
    sessionId,
    uiLocale: uiSettings.locale,
    jobRunner,
    domListPicker,
    domListFollowEnabled,
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
  const navConfirmClosePendingRef = useRef<
    import("../nav/nav-confirm-close").NavConfirmClosePending | null
  >(null)
  useEffect(() => {
    navArmedRef.current = navArmed
  }, [navArmed])
  useEffect(() => {
    navActiveRef.current = navActive
  }, [navActive])

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

  const {
    mode,
    setMode,
    line,
    setLine,
    cursorPos,
    setCursorPos,
    isComposing,
    setIsComposing,
    compositionAnchor,
    setCompositionAnchor,
    localCompletion,
    histNavIndex,
    setHistNavIndex,
    histDraft,
    setHistDraft,
    skipHistResetRef,
    iSearchCycle,
    setISearchCycle,
    iSearchSnapshot,
    setISearchSnapshot,
    iSearchMatches,
    iSearchPreview,
    tabPressSeqRef,
    lineRef,
    cursorRef,
    navPromptSnapRef,
    completionCandidatesRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    cursorMirrorCellRef,
    subCmdPickerHostRef,
    mirror,
    promptLine
  } = useShellPromptCore({ history, completionCandidates })

  const navReloadTabMeta = useMemo(
    () => new Map(navReloadTabMetaRef.current),
    // EN: Refresh chip faces when picker fills meta, or when line tokens change.
    [navReloadTabMetaRev, line]
  )

  useEffect(() => {
    const spans = findNavReloadTabTokenSpans(line)
    const missing = spans.filter((s) => !navReloadTabMetaRef.current.has(s.tabId))
    if (missing.length === 0) {
      return
    }
    let cancelled = false
    void (async () => {
      let added = false
      for (const span of missing) {
        if (cancelled) {
          return
        }
        try {
          const tab = await chrome.tabs.get(span.tabId)
          if (cancelled || navReloadTabMetaRef.current.has(span.tabId)) {
            continue
          }
          const title = (tab.title ?? "").trim() || "(no title)"
          const rawUrl = typeof tab.url === "string" ? tab.url : ""
          navReloadTabMetaRef.current.set(span.tabId, {
            title,
            faviconSrc: resolveTabFaviconSrc(rawUrl),
            label: title
          })
          added = true
        } catch {
          /* EN: Tab may already be closed — keep token fallback face. */
        }
      }
      if (added && !cancelled) {
        setNavReloadTabMetaRev((n) => n + 1)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [line])

  const promptFootSignature = useMemo(
    () =>
      [
        modeToolbarOrder.join(","),
        detailBarId ?? "",
        paneFocus,
        settingListPicker !== null ? "1" : "0",
        tabPicker !== null ? "1" : "0",
        searchListPicker !== null ? "1" : "0",
        domListPicker !== null ? "1" : "0",
        navArmed ? "1" : "0",
        navActive ? "1" : "0",
        mode,
        String(line.length)
      ].join("|"),
    [
      modeToolbarOrder,
      detailBarId,
      paneFocus,
      settingListPicker,
      tabPicker,
      searchListPicker,
      domListPicker,
      navArmed,
      navActive,
      mode,
      line.length
    ]
  )

  const { scrollRef, scrollAnchorRef, logScrollable, scrollPromptFootIntoView } = useLogScroll({
    lines,
    mode,
    line,
    postUpgradeBanner,
    promptFootSignature
  })

  const {
    currentTabTitle: navCurrentTabTitle,
    overlayError: navOverlayError,
    activateError: navActivateError,
    typingMode: navPageTyping,
    typingMultiline: navTypingMultiline,
    menuOpen: navMenuOpen,
    textSelPhase: navTextSelPhase,
    jumpMode: navJumpMode,
    jumpQuery: navJumpQuery,
    jumpFilter: navJumpFilter,
    targetLabel: navTargetLabel,
    jumpMatchCount: navJumpMatchCount,
    jumpInputRef: navJumpInputRef,
    onJumpQueryChange: navOnJumpQueryChange,
    onJumpInputKeyDown: navOnJumpInputKeyDown,
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
    uiLocale: uiSettings.locale,
    hostTabId: hostKind === "float" ? floatTabId : null
  })

  const navTextSelDone = navTextSelPhase === "done"

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
    void loadDomPickerSettings().then((s) => {
      setDomPageActiveMode(s.pageActive)
      domPageActiveModeRef.current = s.pageActive
    })
  }, [])

  useEffect(() => {
    tabsPageActiveModeRef.current = tabsPageActiveMode
  }, [tabsPageActiveMode])

  useEffect(() => {
    searchPageActiveModeRef.current = searchPageActiveMode
  }, [searchPageActiveMode])

  useEffect(() => {
    domPageActiveModeRef.current = domPageActiveMode
  }, [domPageActiveMode])

  const {
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
  } = usePromptPickers({
    sessionId,
    mode,
    line,
    cursorPos,
    isComposing,
    localCompletion,
    sessionListRows,
    navPageTyping,
    paneFocusRef,
    sessionNameTypingRef,
    scrollRef,
    cursorMirrorCellRef,
    subCmdPickerHostRef,
    navReloadTabMetaRef,
    onNavReloadTabMetaUpdated: () => setNavReloadTabMetaRev((n) => n + 1)
  })

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
    jobRunner,
    line,
    cursorPos,
    appendLogLines,
    setSearchListPicker,
    setModeToolbarOrder,
    setSubCmdPicker,
    searchListPickerRef
  })

  const { runSnapshotSave } = useSnapshotSaveShell({
    sessionId,
    uiLocale: uiSettings.locale,
    appendLogLines
  })

  const focusPromptNow = useCallback(() => {
    imeRef.current?.focus({ preventScroll: true })
  }, [])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => focusPromptNow())
  }, [focusPromptNow])

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
    uiLocale: uiSettings.locale,
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

  const {
    promptPaneFocused,
    pickerPulseSlot,
    pickerColumnOrder,
    activatePaneFocus,
    activateDetailBar,
    enterPickerFromDetailBar,
    exitPickerToDetailBar,
    exitDetailBarToTerminal,
    closeSettingPickerColumn,
    focusPickerSlot,
    handleToggleNavActive
  } = usePaneFocusController({
    sessionId,
    isFocusedPane,
    paneFocus,
    onPaneFocusChange,
    detailBarId,
    setDetailBarId,
    modeToolbarOrder,
    setModeToolbarOrder,
    sessionPickers,
    navArmed,
    navActive,
    navArmedRef,
    navActiveRef,
    navPageTyping,
    navTypingMode,
    navMenuOpen,
    navTextSelPicking,
    navTextSelDone,
    sessionNameTyping,
    mode,
    subCmdPicker,
    sessionListPickerOpen,
    tabPicker,
    searchListPicker,
    domListPicker,
    settingListPicker,
    translateEnabled,
    translatePairIdRef,
    tabsPageActiveModeRef,
    searchPageActiveModeRef,
    domPageActiveModeRef,
    setTabsPageActiveMode,
    setSearchPageActiveMode,
    setDomPageActiveMode,
    setTranslatePairId,
    toggleNavActive,
    resetNavTranslateSession,
    lineRef,
    cursorRef,
    setCursorPos,
    imeRef,
    tabPickerInputRef,
    searchPickerInputRef,
    domPickerInputRef,
    settingPickerInputRef,
    pickersForColumnOrder,
    openPickers,
    focusPrompt,
    closePromptPickerUi,
    setSettingListPicker,
    uiLocale: uiSettings.locale,
    jobRunner,
    appendLogLines,
    setTabPicker,
    setSearchListPicker,
    setDomListPicker,
    clearSearchLoadingProgress,
    teardownNav,
    navPositionsRef,
    setNavArmed,
    setNavActive
  })



  const {
    onSettingPickerStateChange,
    onSettingPickerRowAction,
    onSettingPickerApplyEdit,
    onSettingPickerEditInvalid
  } = useSettingPickerShell({
    sessionId,
    uiLocale: uiSettings.locale,
    appendLogLines,
    replaceUiSettingsState,
    closeSettingPickerColumn,
    setSettingListPicker,
    settingListPickerRef
  })

  useEffect(() => {
    if (!isFocusedPane || !externalSettingsRecovery.pending) {
      return
    }
    if (externalSettingsRecovery.announcedRef.current) {
      return
    }
    externalSettingsRecovery.announcedRef.current = true
    void appendLogLines(
      externalSettingsRecoveryLogLines(
        uiSettings.locale,
        externalSettingsRecovery.directoryName,
        externalSettingsRecovery.missing
      )
    )
  }, [
    appendLogLines,
    externalSettingsRecovery,
    isFocusedPane,
    uiSettings.locale
  ])

  useEffect(() => {
    const lines = externalSettingsRecovery.loadErrorLogLines
    if (!isFocusedPane || !lines) {
      return
    }
    if (externalSettingsRecovery.loadErrorAnnouncedRef.current) {
      return
    }
    externalSettingsRecovery.loadErrorAnnouncedRef.current = true
    void appendLogLines([...lines])
  }, [appendLogLines, externalSettingsRecovery, isFocusedPane])

  const openSessionListPicker = useCallback(() => {
    sessionListPickerDismissedRef.current = false
    openSessionPicker("list")
  }, [openSessionPicker, sessionListPickerDismissedRef])

  const syncPromptDom = useCallback((nextLine: string, cursor: number) => {
    const ta = imeRef.current
    if (!ta) {
      return
    }
    ta.value = nextLine
    const pos = Math.max(0, Math.min(cursor, nextLine.length))
    ta.setSelectionRange(pos, pos)
  }, [])

  const flushFloatPersist = useCallback(async () => {
    if (flushFloatPersistProp) {
      await flushFloatPersistProp()
    }
  }, [flushFloatPersistProp])

  const { submitLine } = useCommandDispatch({
    sessionId,
    sessionOrderLength,
    hostKind,
    applyRunCmdPatches,
    mode,
    iSearchMatches,
    iSearchCycle,
    iSearchSnapshot,
    sessionListRows,
    uiSettings,
    navArmedRef,
    navActiveRef,
    navPositionsRef,
    jobRunner,
    beginCommandBusy,
    updateCommandBusyMessage,
    updateCommandBusyProgress,
    endCommandBusy,
    isCommandBusy: () => isCommandBusyRef.current,
    isBusyTokenActive,
    cancelCommandBusy,
    tabPickerRef,
    searchListPickerRef,
    domListPickerRef,
    settingListPickerRef,
    tabsPageActiveModeRef,
    domPageActiveModeRef,
    translatePairIdRef,
    promptLine,
    syncPromptDom,
    flushFloatPersist,
    allowEmptyFirstPickerSyncRef,
    imeTokenPickerDismissedRef,
    tabPressSeqRef,
    lineRef,
    sessionListPickerDismissedRef,
    sessionNameTypingRef,
    sessionListPickerHiRef,
    setTabsPageActiveMode,
    setDomPageActiveMode,
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
    openSessionListPicker,
    setSubCmdPicker,
    runDomListAndShow,
    runSearchListSearch,
    runSnapshotSave,
    syncImeTokenPicker,
    openSessionNameTyping,
    saveSessionDisplayName,
    onSetSessionDisplayName,
    onActivateSession,
    externalSettingsRecoveryPendingRef: externalSettingsRecovery.pendingRef,
    submitExternalSettingsRecoveryAnswer: externalSettingsRecovery.submitRecoveryAnswer,
    navConfirmClosePendingRef
  })

  const getPromptLockedPrefix = useCallback((): string | null => {
    // EN: Close confirm uses log + free y/n (not a locked prompt prefix).
    return null
  }, [])

  const {
    applyPromptLine,
    onImeInput,
    onImeSelect,
    onBeforeInput,
    onPaste,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd
  } = useNavPromptBridge({
    navPageTyping,
    navTypingMultiline,
    mode,
    promptPaneFocused,
    isComposing,
    lineRef,
    cursorRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    navPromptSnapRef,
    skipHistResetRef,
    tabPressSeqRef,
    allowEmptyFirstPickerSyncRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    setSubCmdPicker,
    setHistNavIndex,
    setISearchCycle,
    setLine,
    setCursorPos,
    setIsComposing,
    setCompositionAnchor,
    syncImeTokenPicker,
    focusPrompt,
    resetNavTranslateSession,
    getPromptLockedPrefix
  })

  const insertPrintableWhenReclaiming = useCallback(
    (ch: string) => {
      const ta = imeRef.current
      const base = ta?.value ?? lineRef.current
      const locked = getPromptLockedPrefix()
      let start = ta?.selectionStart ?? cursorRef.current
      let end = ta?.selectionEnd ?? cursorRef.current
      if (locked && locked.length > 0) {
        start = Math.max(start, locked.length)
        end = Math.max(end, locked.length)
      }
      const nextLine = base.slice(0, start) + ch + base.slice(end)
      const nextCursor = start + ch.length
      if (ta) {
        ta.value = nextLine
      }
      applyPromptLine(nextLine, nextCursor, ta)
    },
    [applyPromptLine, cursorRef, getPromptLockedPrefix, imeRef, lineRef]
  )

  const deleteBackwardWhenReclaiming = useCallback(() => {
    const ta = imeRef.current
    const base = ta?.value ?? lineRef.current
    const start = ta?.selectionStart ?? cursorRef.current
    const end = ta?.selectionEnd ?? cursorRef.current
    const locked = getPromptLockedPrefix()
    if (
      locked &&
      locked.length > 0 &&
      lockedPrefixBlocksDelete(
        locked,
        start,
        end,
        start !== end ? "deleteByCut" : "deleteContentBackward"
      )
    ) {
      applyPromptLine(base, Math.max(locked.length, start), ta)
      return
    }
    if (start !== end) {
      const nextLine = base.slice(0, start) + base.slice(end)
      if (ta) {
        ta.value = nextLine
      }
      applyPromptLine(nextLine, start, ta)
      return
    }
    if (start <= 0) {
      return
    }
    const blocked = deleteNavReloadTabBlockAtCursor(base, start)
    if (blocked) {
      if (ta) {
        ta.value = blocked.line
      }
      applyPromptLine(blocked.line, blocked.cursor, ta)
      return
    }
    const nextLine = base.slice(0, start - 1) + base.slice(start)
    const nextCursor = start - 1
    if (ta) {
      ta.value = nextLine
    }
    applyPromptLine(nextLine, nextCursor, ta)
  }, [applyPromptLine, cursorRef, getPromptLockedPrefix, imeRef, lineRef])

  const deleteForwardWhenReclaiming = useCallback(() => {
    const ta = imeRef.current
    const base = ta?.value ?? lineRef.current
    const start = ta?.selectionStart ?? cursorRef.current
    const end = ta?.selectionEnd ?? cursorRef.current
    const locked = getPromptLockedPrefix()
    if (
      locked &&
      locked.length > 0 &&
      lockedPrefixBlocksDelete(
        locked,
        start,
        end,
        start !== end ? "deleteByCut" : "deleteContentForward"
      )
    ) {
      applyPromptLine(base, Math.max(locked.length, start), ta)
      return
    }
    if (start !== end) {
      const nextLine = base.slice(0, start) + base.slice(end)
      if (ta) {
        ta.value = nextLine
      }
      applyPromptLine(nextLine, start, ta)
      return
    }
    if (start >= base.length) {
      return
    }
    const blocked = deleteNavReloadTabBlockForwardAtCursor(base, start)
    if (blocked) {
      if (ta) {
        ta.value = blocked.line
      }
      applyPromptLine(blocked.line, blocked.cursor, ta)
      return
    }
    const nextLine = base.slice(0, start) + base.slice(start + 1)
    if (ta) {
      ta.value = nextLine
    }
    applyPromptLine(nextLine, start, ta)
  }, [applyPromptLine, cursorRef, getPromptLockedPrefix, imeRef, lineRef])

  usePromptTypingFocus({
    enabled: promptPaneFocused,
    imeRef,
    logScrollRef: scrollRef,
    focusPromptNow,
    scrollPromptFootIntoView,
    insertPrintableWhenReclaiming,
    deleteBackwardWhenReclaiming,
    deleteForwardWhenReclaiming
  })

  const { onKeyDown } = useShellKeyboard({
    navPageTyping,
    navTypingMultiline,
    promptPaneFocused,
    sessionNameTypingRef,
    mode,
    history,
    histNavIndex,
    histDraft,
    iSearchMatches,
    iSearchSnapshot,
    iSearchCycle,
    navArmed,
    isFocusedPane,
    paneFocus,
    navKeyboardEnabled,
    navTypingMode,
    navMenuOpen,
    navTextSelPicking,
    navTextSelDone,
    navTextSelPhase,
    tabPicker,
    sidePickerOpen,
    sessionId,
    lineRef,
    cursorRef,
    paneFocusRef,
    tabPressSeqRef,
    allowEmptyFirstPickerSyncRef,
    tabPickerOpenRequestRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    completionCandidatesRef,
    subCmdPickerRef,
    sessionListPickerHiRef,
    sessionListPickerRowsRef,
    sessionPickerVariantRef,
    tabPickerRef,
    searchListPickerRef,
    jobRunner,
    setLine,
    setCursorPos,
    setMode,
    setHistNavIndex,
    setHistDraft,
    setISearchCycle,
    setISearchSnapshot,
    setSubCmdPicker,
    setSessionListPickerHi,
    skipHistResetRef,
    focusPrompt,
    submitLine,
    syncImeTokenPicker,
    dismissImeTokenPicker,
    cancelSearchPageScan,
    cancelCommandBusy,
    isCommandBusy: () => isCommandBusyRef.current,
    closeSessionNameTyping,
    closeSessionListPicker,
    applySessionSwitchPick,
    switchSessionFromListPicker,
    handleToggleNavActive,
    promptLine,
    getPromptLockedPrefix
  })
  /** EN: Controlled `value` fights browser/IME inserts during nav page-field typing. */
  const shellScrollClassName = `bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`

  const shellContent = (
    <>
        {upgradeBannerReady && (lines.length === 0 || postUpgradeBanner) ? (
          <div className="bmxt-hint">
            {tShell("shell.welcome", uiSettings.locale)}
            <br />
            {tShell("shell.helpHint", uiSettings.locale)}
            <br />
            <br />
            {tShell("shell.reloadHint", uiSettings.locale)}
          </div>
        ) : null}
        {upgradeBannerReady && postUpgradeBanner ? (
          <div className="bmxt-version-upgrade">
            <div className="bmxt-version-upgrade-title">
              {versionUpgradeTitle(uiSettings.locale, postUpgradeBanner.version)}
            </div>
            <div className="bmxt-version-upgrade-notes">
              {formatBulletedLines(postUpgradeBanner, uiSettings.locale).map((line, i) => (
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
          isCommandBusy={isCommandBusy}
          showCommandBusy={showCommandBusy}
          commandBusyLabel={commandBusyLabel}
          mirror={mirror}
          uiLocale={uiSettings.locale}
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
          navReloadTabMeta={navReloadTabMeta}
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
            jumpMode: navJumpMode,
            jumpQuery: navJumpQuery,
            jumpFilter: navJumpFilter,
            jumpMatchCount: navJumpMatchCount,
            targetLabel: navTargetLabel,
            activateError: navActivateError,
            jumpInputRef: navJumpInputRef,
            onJumpQueryChange: navOnJumpQueryChange,
            onJumpInputKeyDown: navOnJumpInputKeyDown,
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
            kind: domListPicker?.kind === "prompt" ? "prompt" : "lines",
            pageActiveMode: domPageActiveMode
          }}
          setting={{
            pickerOpen: settingListPicker !== null
          }}
        />
        <div ref={scrollAnchorRef} className="bmxt-scroll-anchor" aria-hidden />
    </>
  )

  return (
    <div className="bmxt-shell-root">
      <div
        className="bmxt-terminal-split"
        data-bmxt-session-id={sessionId}
        data-bmxt-leaf-focused={isFocusedPane ? "" : undefined}>
        <div
          className={`bmxt-split-terminal-pane${promptPaneFocused ? " bmxt-split-pane--focused" : ""}`}
          onMouseDown={(e) => {
            if (e.button !== 0) {
              return
            }
            if (!(e.target instanceof Element)) {
              return
            }
            if (e.target.closest("a, button, input, textarea, select")) {
              return
            }
            // EN: Nav cursor ON keeps detail-bar focus — do not yank to the prompt (typing is the exception).
            if (navActive && !navPageTyping) {
              return
            }
            // EN: Log-line mousedown must not yank IME focus — drag-select needs it.
            // Typing / non-select mouseup reclaim focus via usePromptTypingFocus.
            if (e.target.closest(".bmxt-out-line, .bmxt-hint, .bmxt-version-upgrade")) {
              if (paneFocus !== "terminal") {
                activatePaneFocus("terminal")
              }
              return
            }
            if (paneFocus !== "terminal") {
              activatePaneFocus("terminal")
              return
            }
            focusPromptNow()
          }}>
          <div ref={scrollRef} className={shellScrollClassName} tabIndex={-1}>
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
          onRefreshDomViewport={(state) => refreshDomViewportForPicker(state)}
          onApplyDomViewportCapture={(capture) => {
            setDomListPicker(sessionId, (prev) => {
              if (!prev || prev.kind !== "lines") {
                return prev
              }
              return {
                ...prev,
                lines: capture.lines,
                jumpPaths: capture.jumpPaths,
                headerLineCount: capture.headerLineCount
              }
            })
          }}
          tabsPageActiveMode={tabsPageActiveMode}
          searchPageActiveMode={searchPageActiveMode}
          domPageActiveMode={domPageActiveMode}
        />
      </div>
    </div>
  )
}
