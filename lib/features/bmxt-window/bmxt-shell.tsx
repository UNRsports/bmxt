import { flushSync } from "react-dom"
import { continuationPromptAfterLoneFirstToken } from "../builtin-commands/command-subcommands.gen"
import { resolveImeTokenPicker } from "../command-line/ime-token-picker"
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
  type TabsPageActiveMode
} from "../tabs"
import { openSearchPickerEntry } from "../search/open-search-picker-entry"
import {
  openPickerSlots,
  pickerEntriesFromSearchLines,
  SessionPickerColumns,
  type PickerEntry,
  type PickerSlotId,
  type SessionPickerState
} from "../side-picker"
import {
  navigatePaneStripHoriz,
  paneStripHorizAtEdge,
  registerPaneStrip,
  tryNavigatePaneStrip,
  type PaneFocusTarget,
  type PaneStripActions
} from "../side-picker/panel/pane-focus-nav"
import { TokenPickerPanel, type TokenPickerModel } from "./token-picker-panel"
import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchExitListLine,
  parseSearchListPickerLine,
  searchListPatternFromLine,
  shouldShowSearchListPatternPlaceholder,
  type SearchListPickerState
} from "../search/search-list-picker-input"
import { enrichSearchPickerEntriesFromOpenTabs } from "../search/enrich-search-entries-from-tabs"
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
import { buildHelpLines } from "../bmxt-core/registry/help"
import {
  bgImportErrorLine,
  clearUiBackgroundImage,
  DEFAULT_SETTING_LIST_PICKER_STATE,
  exportUiSettingsZip,
  importUiSettingsZipFromFilePicker,
  importBackgroundImageFromFilePicker,
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListPickerLine,
  replaceUiSettings,
  resetUiAppearance,
  saveUiAppearancePatch,
  saveUiBackgroundImage,
  saveUiLocale,
  settingTokenForUiLocale,
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
  useState
} from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "./csp-dynamic-stylesheet"
import type { PostUpgradeBanner } from "./use-version-upgrade-banner"

export type { TabPickerState } from "../side-picker/session/tab-picker-state"
import type { TabPickerState, TabPickerInteractiveSnapshot } from "../side-picker/session/tab-picker-state"

function effectsIncludeSearchPage(effects: ChromeEffect[]): boolean {
  return effects.some((e) => e.kind === "search_page")
}

function shouldAutoSubmitAfterTokenPick(trimmed: string): boolean {
  return (
    parseDomListPickerLine(trimmed) !== null ||
    parseNavEnterLine(trimmed) ||
    parseNavExitLine(trimmed) ||
    parseTabsListPickerLine(trimmed) !== null ||
    parseTabsExitListLine(trimmed) ||
    parseSettingListPickerLine(trimmed) ||
    parseSettingExitListLine(trimmed) ||
    parseSearchExitListLine(trimmed) ||
    parseDomExitListLine(trimmed) ||
    parseGroupNewInteractiveLine(trimmed)
  )
}

type Props = {
  /** コマンド実行・ログ追記のスコープ（複数ターミナル）。 */
  sessionId: string
  /** split 複数ペイン時、キーボード入力を受け取るのはこれが true のペインだけ。 */
  isFocusedPane: boolean
  lines: string[]
  history: string[]
  completionCandidates: string[]
  appendLogLines: (newLines: string[]) => Promise<void>
  appendCommandToHistory: (cmd: string) => void
  sessionPickers: SessionPickerState
  /** 第1引数でセッションを固定（非同期完了後も正しいターミナルに紐づく）。 */
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K]
  ) => void
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
  /** マニフェスト更新後の初回起動のみ（ウェルカムと併せて表示）。 */
  postUpgradeBanner: PostUpgradeBanner | null
  paneFocus: PaneFocusTarget
  onPaneFocusChange: (target: PaneFocusTarget) => void
}

export function BmxtShell({
  sessionId,
  isFocusedPane,
  lines,
  history,
  completionCandidates,
  appendLogLines,
  appendCommandToHistory,
  sessionPickers,
  setSessionPickerSlot,
  refreshTabPickerRows,
  scheduleTabPickerRowsRefresh,
  postUpgradeBanner,
  paneFocus,
  onPaneFocusChange
}: Props) {
  const { settings: uiSettings, setLocale: setUiLocale, setAppearance: setUiAppearance } =
    useUiSettings()
  const uiCopy = useUiCopy()
  const tabPicker = sessionPickers.tabs
  const searchListPicker = sessionPickers.search
  const domListPicker = sessionPickers.dom
  const settingListPicker = sessionPickers.setting
  const setTabPicker = useCallback(
    (forSessionId: string, v: TabPickerState | null) => {
      setSessionPickerSlot(forSessionId, "tabs", v)
    },
    [setSessionPickerSlot]
  )
  const setSearchListPicker = useCallback(
    (forSessionId: string, v: SearchListPickerState | null) => {
      setSessionPickerSlot(forSessionId, "search", v)
    },
    [setSessionPickerSlot]
  )
  const setDomListPicker = useCallback(
    (forSessionId: string, v: DomListPickerState | null) => {
      setSessionPickerSlot(forSessionId, "dom", v)
    },
    [setSessionPickerSlot]
  )
  const setSettingListPicker = useCallback(
    (forSessionId: string, v: SettingListPickerState | null) => {
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
  const paneStripActionsRef = useRef<PaneStripActions>({
    setFocus: () => {},
    focusTerminal: () => {},
    focusPicker: () => {}
  })
  const tabPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const searchPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const domPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const settingPickerInputRef = useRef<HTMLTextAreaElement | null>(null)

  const openPickers = useMemo(
    () => openPickerSlots(sessionPickers),
    [sessionPickers]
  )

  const tabsPickerKeyboardActive = paneFocus === "tabs" && isFocusedPane
  const searchPickerKeyboardActive = paneFocus === "search" && isFocusedPane
  const domPickerKeyboardActive = paneFocus === "dom" && isFocusedPane
  const settingPickerKeyboardActive = paneFocus === "setting" && isFocusedPane

  useEffect(() => {
    paneFocusRef.current = paneFocus
  }, [paneFocus])

  isFocusedPaneRef.current = isFocusedPane
  openPickersRef.current = openPickers

  useEffect(() => {
    if (paneFocus === "tabs" && tabPicker === null) {
      onPaneFocusChange("terminal")
    } else if (paneFocus === "search" && searchListPicker === null) {
      onPaneFocusChange("terminal")
    } else if (paneFocus === "dom" && domListPicker === null) {
      onPaneFocusChange("terminal")
    } else if (paneFocus === "setting" && settingListPicker === null) {
      onPaneFocusChange("terminal")
    }
  }, [paneFocus, tabPicker, searchListPicker, domListPicker, settingListPicker, onPaneFocusChange])

  useEffect(() => {
    if (!sidePickerOpen) {
      onPaneFocusChange("terminal")
    }
  }, [onPaneFocusChange, sidePickerOpen])
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
  const searchListDismissRef = useRef(false)
  const domListDismissRef = useRef(false)
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
  const [navArmed, setNavArmed] = useState(false)
  const [navActive, setNavActive] = useState(false)
  const [translateEnabled, setTranslateEnabled] = useState(false)
  const [translatePairId, setTranslatePairId] = useState<TranslationPairId>(
    DEFAULT_TRANSLATION_PAIR_ID
  )
  const translateEnabledRef = useRef(false)
  const translatePairIdRef = useRef<TranslationPairId>(DEFAULT_TRANSLATION_PAIR_ID)
  const [modeToolbarOrder, setModeToolbarOrder] = useState<ModeToolbarId[]>([])
  const [tabsPageActiveMode, setTabsPageActiveMode] = useState<TabsPageActiveMode>("auto")
  const tabsPageActiveModeRef = useRef<TabsPageActiveMode>("auto")
  const navTranslateBlocksRef = useRef<readonly TranslationBlock[]>([])
  const flushNavTranslateRef = useRef<() => Promise<void>>(async () => {})
  const setNavTranslateCommitErrorRef = useRef<(message: string | null) => void>(() => {})
  const navPositionsRef = useRef<NavPositionsByTab>({})
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
    }
  })

  const navTextSelDone = navTextSelPhase === "done"

  const [subCmdPicker, setSubCmdPicker] = useState<TokenPickerModel | null>(null)
  const subCmdPickerRef = useRef<TokenPickerModel | null>(null)
  useEffect(() => {
    subCmdPickerRef.current = subCmdPicker
  }, [subCmdPicker])
  const [mode, setMode] = useState<"normal" | "isearch">("normal")
  const [line, setLine] = useState("")
  const [cursorPos, setCursorPos] = useState(0)
  const [logScrollable, setLogScrollable] = useState(false)
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
  }, [])

  useEffect(() => {
    tabsPageActiveModeRef.current = tabsPageActiveMode
  }, [tabsPageActiveMode])

  const scrollRef = useRef<HTMLDivElement>(null)
  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)
  const [subCmdPickerPos, setSubCmdPickerPos] = useState<{ left: number; top: number } | null>(
    null
  )
  const subCmdPickerScopeId = `subcmd-picker-${sessionId}`
  useCspDynamicStyle(
    subCmdPicker && subCmdPickerPos ? subCmdPickerScopeId : null,
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
  /** EN: Esc closed the token menu — suppress until Tab or typing; not history ↑↓. */
  const imeTokenPickerDismissedRef = useRef(false)
  const searchListBusyRef = useRef(false)
  const [searchListBusy, setSearchListBusy] = useState(false)

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

  const dismissImeTokenPicker = useCallback(() => {
    allowEmptyFirstPickerSyncRef.current = false
    imeTokenPickerDismissedRef.current = true
    setSubCmdPicker(null)
  }, [])

  const syncImeTokenPicker = useCallback(
    (ln: string, pos: number) => {
      if (navPageTyping) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        return
      }
      if (mode === "isearch" || searchListBusyRef.current) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
        return
      }
      if (imeTokenPickerDismissedRef.current) {
        setSubCmdPicker(null)
        return
      }
      const resolved = resolveImeTokenPicker(ln, pos, completionCandidatesRef.current, {
        emptyFirstPrefixShowsAll: allowEmptyFirstPickerSyncRef.current,
        candidateMatch: subCmdPickerRef.current !== null ? "contains" : "prefix"
      })
      if (!resolved) {
        setSubCmdPicker(null)
        allowEmptyFirstPickerSyncRef.current = false
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
    [mode, navPageTyping]
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
  }, [lines, mode, line, syncLogScroll, postUpgradeBanner])

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
    if (!subCmdPicker) {
      setSubCmdPickerPos(null)
      return
    }
    const measure = () => {
      const cell = cursorMirrorCellRef.current
      const host = subCmdPickerHostRef.current
      if (!cell) {
        return
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
      setSubCmdPickerPos((prev) => {
        const next = { left, top }
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
  }, [subCmdPickerAnchorEpisode, line, cursorPos, mode])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => imeRef.current?.focus())
  }, [])

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

  const activatePaneFocus = useCallback(
    (target: PaneFocusTarget) => {
      onPaneFocusChange(target)
      if (target === "terminal") {
        focusPrompt()
      } else {
        pickerInputRefForSlot(target).current?.focus()
      }
    },
    [focusPrompt, onPaneFocusChange, pickerInputRefForSlot]
  )

  /** EN: When a picker column newly appears, move pane focus + blue border to match keyboard target. */
  const prevSidePickersOpenRef = useRef({
    tabs: false,
    search: false,
    dom: false,
    setting: false
  })
  useLayoutEffect(() => {
    const nowTabs = tabPicker !== null
    const nowSearch = searchListPicker !== null
    const nowDom = domListPicker !== null
    const nowSetting = settingListPicker !== null
    const prev = prevSidePickersOpenRef.current
    prevSidePickersOpenRef.current = {
      tabs: nowTabs,
      search: nowSearch,
      dom: nowDom,
      setting: nowSetting
    }

    if (!isFocusedPane) {
      return
    }

    let opened: PickerSlotId | null = null
    if (!prev.setting && nowSetting) {
      opened = "setting"
    } else if (!prev.dom && nowDom) {
      opened = "dom"
    } else if (!prev.search && nowSearch) {
      opened = "search"
    } else if (!prev.tabs && nowTabs) {
      opened = "tabs"
    }
    if (opened === null) {
      return
    }

    onPaneFocusChange(opened)
    requestAnimationFrame(() => {
      pickerInputRefForSlot(opened).current?.focus()
    })
  }, [
    tabPicker,
    searchListPicker,
    domListPicker,
    settingListPicker,
    isFocusedPane,
    onPaneFocusChange,
    pickerInputRefForSlot
  ])

  useEffect(() => {
    paneStripActionsRef.current = {
      setFocus: activatePaneFocus,
      focusTerminal: focusPrompt,
      focusPicker: (slot) => pickerInputRefForSlot(slot).current?.focus()
    }
  }, [activatePaneFocus, focusPrompt, pickerInputRefForSlot])

  useEffect(() => {
    return registerPaneStrip(
      sessionId,
      () => ({
        open: openPickersRef.current,
        focus: paneFocusRef.current,
        isFocusedLeaf: isFocusedPaneRef.current
      }),
      paneStripActionsRef.current
    )
  }, [sessionId])

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) {
        return
      }
      if (!e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      const horiz =
        e.key === "ArrowLeft" || e.code === "ArrowLeft"
          ? "left"
          : e.key === "ArrowRight" || e.code === "ArrowRight"
            ? "right"
            : null
      if (!horiz) {
        return
      }
      if (!isFocusedPaneRef.current || openPickersRef.current.length === 0) {
        return
      }
      const open = openPickersRef.current
      const focus = paneFocusRef.current
      if (paneStripHorizAtEdge(open, focus, horiz)) {
        return
      }
      if (navigatePaneStripHoriz(open, focus, horiz, paneStripActionsRef.current)) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [])

  const terminalPaneActive = isFocusedPane && paneFocus === "terminal"

  useLayoutEffect(() => {
    if (!terminalPaneActive) {
      imeRef.current?.blur()
      return
    }
    focusPrompt()
  }, [terminalPaneActive, focusPrompt])

  useEffect(() => {
    if (!terminalPaneActive) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [terminalPaneActive, focusPrompt])

  const runDomListAndShow = useCallback(
    async (
      domListLine: string,
      displayLine: string,
      announce: boolean
    ): Promise<void> => {
      domListDismissRef.current = false
      try {
        await ensureBmxtCore()
        const bundle = runDispatch(domListLine)
        if (bundle.ty === "lines") {
          await appendLogLines([`> ${displayLine}`, ...(bundle.lines ?? [])])
          setDomListPicker(sessionId, null)
          return
        }
        let domCapture: DomListCapture | undefined
        const ctx: DispatchChromeContext = {
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
        }
        const linesOut = await applyChromeEffects(ctx, bundle.effects ?? [])
        if (domListDismissRef.current) {
          domListDismissRef.current = false
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
      } catch (e) {
        await appendLogLines([
          `> ${displayLine}`,
          uiCopy.t("error.generic", {
            message: e instanceof Error ? e.message : String(e)
          })
        ])
        setDomListPicker(sessionId, null)
      }
    },
    [appendLogLines, sessionId, setDomListPicker, resolveDomListTargetTabId]
  )

  const refreshDomListPicker = useCallback(
    (commandLine: string) => runDomListAndShow(commandLine, commandLine, false),
    [runDomListAndShow]
  )

  const { onTabsPickerFocusTabId: queueDomListFollowRefresh } = useDomListFollowTab({
    domListPicker,
    resolveTargetTabId: resolveDomListTargetTabId,
    refreshDomList: refreshDomListPicker
  })

  const onTabsPickerFocusTabId = useCallback(
    (tabId: number | null) => {
      tabsPickerFocusTabIdRef.current = tabId
      queueDomListFollowRefresh(tabId)
    },
    [queueDomListFollowRefresh]
  )

  const onTabPickerInteractiveChange = useCallback(
    (snapshot: TabPickerInteractiveSnapshot) => {
      const cur = tabPickerRef.current
      if (!cur) {
        return
      }
      setTabPicker(sessionId, { ...cur, interactive: snapshot })
    },
    [sessionId, setTabPicker]
  )

  const promptLine = useCallback(
    () => imeRef.current?.value ?? lineRef.current,
    []
  )

  const showSearchListPatternPlaceholder = useMemo(
    () =>
      !searchListBusy && shouldShowSearchListPatternPlaceholder(line, cursorPos),
    [line, cursorPos, searchListBusy]
  )

  const appendSearchPickerProgress = useCallback(
    (message: string) => {
      const prev = searchListPickerRef.current
      if (!prev || prev.phase !== "loading") {
        return
      }
      setSearchListPicker(sessionId, {
        ...prev,
        progressLines: [...prev.progressLines, message]
      })
    },
    [sessionId, setSearchListPicker]
  )

  const runSearchListSearch = useCallback(
    async (displayLine: string, searchListLine: string) => {
      if (searchListBusyRef.current) {
        return
      }
      searchListDismissRef.current = false
      searchListBusyRef.current = true
      setSearchListBusy(true)
      setSubCmdPicker(null)

      const progressLabel = searchPageProgressLabel(searchListLine)
      const initialProgress = [`${progressLabel} — searching…`]
      const searchPattern = normalizeSearchPattern(searchListPatternFromLine(searchListLine))

      setSearchListPicker(sessionId, {
        phase: "loading",
        progressLines: initialProgress,
        entries: [],
        pattern: searchPattern
      })

      try {
        await ensureBmxtCore()
        await appendLogLines([`> ${displayLine}`])
        const bundle = runDispatch(searchListLine)
        if (bundle.ty === "lines") {
          setSearchListPicker(sessionId, null)
          await appendLogLines(bundle.lines ?? [])
          return
        }
        const effects = bundle.effects ?? []
        if (effectsIncludeSearchPage(effects)) {
          appendSearchPickerProgress(uiCopy.t("search.pageScanHint"))
        }
        const ctx: DispatchChromeContext = {
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: sessionId,
          uiLocale: uiSettings.locale,
          searchPageProgressLabel: progressLabel,
          onSearchPageProgress: async (message) => {
            appendSearchPickerProgress(message)
          },
          shouldCancelSearchPage: () => searchListDismissRef.current
        }
        const linesOut = await applyChromeEffects(ctx, effects)
        if (searchListDismissRef.current) {
          searchListDismissRef.current = false
          setSearchListPicker(sessionId, null)
          if (linesOut.length > 0) {
            await appendLogLines(linesOut)
          }
          return
        }
        const parsed = pickerEntriesFromSearchLines(linesOut)
        const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, searchPattern)
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
        setSearchListPicker(sessionId, null)
        await appendLogLines([
          uiCopy.t("error.generic", {
            message: e instanceof Error ? e.message : String(e)
          })
        ])
      } finally {
        searchListBusyRef.current = false
        setSearchListBusy(false)
      }
    },
    [appendLogLines, appendSearchPickerProgress, sessionId, setSearchListPicker]
  )

  const cancelSearchPageScan = useCallback(() => {
    if (!searchListBusyRef.current || searchListDismissRef.current) {
      return
    }
    searchListDismissRef.current = true
    void appendLogLines([
      uiCopy.t("search.cancelledCtrlC"),
      uiCopy.t("search.pageScanCancelled")
    ])
  }, [appendLogLines, uiCopy])

  const onSettingPickerStateChange = useCallback(
    (next: SettingListPickerState) => {
      setSettingListPicker(sessionId, next)
    },
    [sessionId, setSettingListPicker]
  )

  const onSettingPickerRowAction = useCallback(
    async (row: SettingPickerRow, _index: number) => {
      const logPrefix = "setting -list"
      if (row.id === "locale-ja" || row.id === "locale-en") {
        const locale = row.id === "locale-ja" ? "ja" : "en"
        await saveUiLocale(locale)
        setUiLocale(locale)
        const token = settingTokenForUiLocale(locale)
        await appendLogLines([
          logPrefix,
          t("setting.language.set", locale, { token })
        ])
        return
      }
      if (row.id === "reset-yes") {
        await resetUiAppearance()
        setUiAppearance({
          fg: null,
          bgColor: null,
          fontSize: null,
          fontFamily: null,
          bgImageDataUrl: null
        })
        await appendLogLines([logPrefix, uiCopy.t("setting.appearance.reset")])
        return
      }
      if (row.id === "reset-no") {
        await appendLogLines([logPrefix, uiCopy.t("setting.appearance.resetCancelled")])
        return
      }
      if (row.id === "size") {
        const fontSize = row.line.trim()
        await saveUiAppearancePatch({ fontSize })
        setUiAppearance({ fontSize })
        await appendLogLines([
          logPrefix,
          uiCopy.t("setting.appearance.updated", { flag: "--size" })
        ])
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
        await saveUiBackgroundImage(result.dataUrl)
        setUiAppearance({ bgImageDataUrl: result.dataUrl })
        await appendLogLines([
          logPrefix,
          uiCopy.t("setting.bgImage.imported", {
            mimeType: result.mimeType,
            byteLength: result.byteLength
          })
        ])
        return
      }
      if (row.id === "bg-clear") {
        await clearUiBackgroundImage()
        setUiAppearance({ bgImageDataUrl: null })
        await appendLogLines([logPrefix, uiCopy.t("setting.bgImage.cleared")])
        return
      }
      if (row.id === "export") {
        try {
          const { filename } = await exportUiSettingsZip()
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
        await replaceUiSettings(result.settings)
        setUiLocale(result.settings.locale)
        setUiAppearance(result.settings.appearance)
        await appendLogLines([logPrefix, uiCopy.t("setting.import.done")])
      }
    },
    [appendLogLines, setUiAppearance, setUiLocale, uiCopy, uiSettings.locale]
  )

  const onSettingPickerApplyEdit = useCallback(
    async (field: SettingEditField, value: string) => {
      const logPrefix = "setting -list"
      const flag = field === "fg" ? "--fg" : field === "bg-color" ? "--bg-color" : "--font"
      const patch =
        field === "fg"
          ? { fg: value }
          : field === "bg-color"
            ? { bgColor: value }
            : { fontFamily: value }
      await saveUiAppearancePatch(patch)
      setUiAppearance(patch)
      await appendLogLines([
        logPrefix,
        uiCopy.t("setting.appearance.updated", { flag })
      ])
    },
    [appendLogLines, setUiAppearance, uiCopy]
  )

  const onSettingPickerEditInvalid = useCallback(async () => {
    await appendLogLines([
      "setting -list",
      uiCopy.t("setting.prompt.editInvalid")
    ])
  }, [appendLogLines, uiCopy])

  const onOpenSearchPickerEntry = useCallback(
    async (entry: PickerEntry, matchIndex: number) => {
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
      await openSearchPickerEntry(entry, matchIndex, ctx, (lines) => appendLogLines(lines), pattern)
    },
    [appendLogLines, sessionId]
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
      appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      const cont = "setting "
      setLine(cont)
      setCursorPos(cont.length)
      lineRef.current = cont
      void appendLogLines([`> ${trimmed}`, uiCopy.t("setting.usage")])
      focusPrompt()
      return
    }

    if (parseSettingListPickerLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        await appendLogLines([`> ${trimmed}`, uiCopy.t("setting.picker.hint")])
        setSettingListPicker(sessionId, { ...DEFAULT_SETTING_LIST_PICKER_STATE })
      })()
      focusPrompt()
      return
    }

    if (parseSettingExitListLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (settingListPickerRef.current !== null) {
          setSettingListPicker(sessionId, null)
          activatePaneFocus("terminal")
          logLines.push(uiCopy.t("setting.picker.closed"))
        } else {
          logLines.push(uiCopy.t("setting.picker.notOpen"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    const tabsSettingCmd = parseTabsSettingCommandLine(trimmed)
    if (tabsSettingCmd !== null) {
      appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      if (tabsSettingCmd.kind === "incomplete") {
        const cont = "tabs "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        void appendLogLines([
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
        void appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("tabs.setting.choose"),
          uiCopy.t("tabs.setting.pageActiveCurrent", {
            token: settingTokenForPageActiveMode(tabsPageActiveModeRef.current)
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
        void appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("tabs.pageActive.choose", { options }),
          uiCopy.t("setting.language.current", {
            token: settingTokenForPageActiveMode(tabsPageActiveModeRef.current)
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
        setTabsPageActiveMode(tabsSettingCmd.mode)
        const token = settingTokenForPageActiveMode(tabsSettingCmd.mode)
        await appendLogLines([`> ${trimmed}`, uiCopy.t("tabs.pageActive.set", { token })])
        focusPrompt()
      })()
      return
    }

    const listPicker = parseTabsListPickerLine(trimmed)
    if (listPicker) {
      const { showUrl } = listPicker
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(showUrl)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          const pageActiveToken = settingTokenForPageActiveMode(tabsPageActiveModeRef.current)
          await appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("tabs.picker.hint", { token: pageActiveToken })
          ])
          setTabPicker(sessionId, { rows, showUrl, initialHi })
          setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await appendLogLines([
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
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (tabPickerRef.current !== null) {
          setTabPicker(sessionId, null)
          setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
          activatePaneFocus("terminal")
          logLines.push(uiCopy.t("tabs.picker.closed"))
        } else {
          logLines.push(uiCopy.t("tabs.picker.notOpen"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseSearchExitListLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const wasBusy = searchListBusyRef.current
        if (wasBusy) {
          searchListDismissRef.current = true
          searchListBusyRef.current = false
          setSearchListBusy(false)
        }
        if (searchListPickerRef.current !== null) {
          setSearchListPicker(sessionId, null)
          activatePaneFocus("terminal")
          logLines.push(uiCopy.t("search.picker.closed"))
        } else if (wasBusy) {
          logLines.push(uiCopy.t("search.picker.cancelled"))
        } else {
          logLines.push(uiCopy.t("search.picker.notOpen"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseNavEnterLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setNavArmed(true)
      setNavActive(false)
      setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
      void (async () => {
        const canPage = await canScriptHttpHostPages()
        const logLines = [`> ${trimmed}`, uiCopy.t("nav.armedLog")]
        if (!canPage) {
          logLines.push(uiCopy.t("nav.hostAccessWarning"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    const translateCmd = parseTranslateCommandLine(trimmed)
    if (translateCmd !== null) {
      appendCommandToHistory(trimmed)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      if (translateCmd.kind === "incomplete") {
        const cont = "translate "
        setLine(cont)
        setCursorPos(cont.length)
        lineRef.current = cont
        void appendLogLines([
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
        void appendLogLines([
          `> ${trimmed}`,
          uiCopy.t("translate.setting.choose", { options }),
          uiCopy.t("setting.language.current", {
            token: settingTokenForPairId(translatePairIdRef.current)
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
          setTranslateEnabled(true)
          setModeToolbarOrder((prev) => activateModeToolbar(prev, "translate"))
          await appendLogLines([
            `> ${trimmed}`,
            translateOnLogLine(
              uiSettings.locale,
              settingTokenForPairId(translatePairIdRef.current)
            )
          ])
          focusPrompt()
        } else if (translateCmd.kind === "off") {
          await saveTranslateEnabled(false)
          setTranslateEnabled(false)
          setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "translate"))
          await appendLogLines([`> ${trimmed}`, uiCopy.t("translate.off")])
          activatePaneFocus("terminal")
        } else if (translateCmd.kind === "setting") {
          await saveTranslatePair(translateCmd.pair)
          setTranslatePairId(translateCmd.pair)
          resetNavTranslateSession()
          const token = settingTokenForPairId(translateCmd.pair)
          await appendLogLines([`> ${trimmed}`, uiCopy.t("translate.pairSet", { token })])
        }
      })()
      return
    }

    if (parseNavExitLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        if (navActiveRef.current) {
          logLines.push(uiCopy.t("nav.exitActiveError"))
        } else if (!navArmedRef.current) {
          logLines.push(uiCopy.t("nav.notArmed"))
        } else {
          await teardownNav()
          navPositionsRef.current = {}
          setNavArmed(false)
          setNavActive(false)
          setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
          logLines.push(uiCopy.t("nav.disarmed"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseDomExitListLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        domListDismissRef.current = true
        if (domListPickerRef.current !== null) {
          setDomListPicker(sessionId, null)
          activatePaneFocus("terminal")
          logLines.push(uiCopy.t("dom.picker.closed"))
        } else {
          logLines.push(uiCopy.t("dom.picker.notOpen"))
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseGroupNewInteractiveLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        try {
          const rows = await buildTabPickerRows(false)
          const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
          await appendLogLines([`> ${trimmed}`, uiCopy.t("group.newPicker")])
          setTabPicker(sessionId, {
            rows,
            showUrl: false,
            initialHi,
            variant: "groupNew"
          })
          setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
        } catch (e) {
          await appendLogLines([
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
      if (searchListBusyRef.current) {
        focusPrompt()
        return
      }
      if (isSearchListContinuationPrompt(rawLine)) {
        appendCommandToHistory(trimmed)
        const next = `${trimmed} `
        lineRef.current = next
        setLine(next)
        setCursorPos(next.length)
        setHistNavIndex(-1)
        tabPressSeqRef.current = 0
        queueMicrotask(() => syncImeTokenPicker(next, next.length))
        focusPrompt()
        return
      }
      if (!isSearchListReadyToRun(trimmed, rawLine)) {
        focusPrompt()
        return
      }
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void runSearchListSearch(trimmed, searchListLine)
      focusPrompt()
      return
    }

    if (trimmed === "help" || trimmed === "?") {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void appendLogLines([`> ${trimmed}`, ...buildHelpLines(uiSettings.locale)])
      focusPrompt()
      return
    }

    const domListLine = parseDomListPickerLine(trimmed)
    if (domListLine !== null) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void runDomListAndShow(domListLine, trimmed, /*announce*/ true)
      focusPrompt()
      return
    }

    appendCommandToHistory(trimmed)
    const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
    setLine("")
    setCursorPos(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    chrome.runtime.sendMessage(
      { type: "RUN_CMD", line: trimmed, sessionId },
      (response) => {
        const err = chrome.runtime.lastError
        if (err) {
          void appendLogLines([
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
          void appendLogLines([
            `> ${trimmed}`,
            uiCopy.t("error.generic", { message: msg })
          ])
        }
      }
    )
    if (continuationPrompt) {
      setLine(continuationPrompt)
      setCursorPos(continuationPrompt.length)
      lineRef.current = continuationPrompt
    }
    focusPrompt()
  }, [
    appendCommandToHistory,
    appendLogLines,
    focusPrompt,
    iSearchCycle,
    iSearchMatches,
    iSearchSnapshot,
    mode,
    promptLine,
    sessionId,
    setUiAppearance,
    setUiLocale,
    uiCopy,
    uiSettings,
    activatePaneFocus,
    setTabPicker,
    setSearchListPicker,
    setSettingListPicker,
    runDomListAndShow,
    runSearchListSearch,
    syncImeTokenPicker,
    teardownNav
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
      allowEmptyFirstPickerSyncRef.current = false
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
    [mode, navPageTyping, syncPromptFromTextarea, syncPromptFromTextareaForComposition]
  )

  const onImeSelect = useCallback(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    const pos = ta.selectionEnd
    setCursorPos(pos)
    syncImeTokenPicker(ta.value, pos)
  }, [isComposing, syncImeTokenPicker])

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
    [mode, navPageTyping, navTypingMultiline, syncImeTokenPicker]
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

      if (e.nativeEvent.isComposing) {
        return
      }

      if (
        searchListBusyRef.current &&
        e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === "c" || e.key === "C")
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
          toggleNavActive()
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
        if (curLn.trim() === "" && !searchListBusyRef.current) {
          e.preventDefault()
          allowEmptyFirstPickerSyncRef.current = true
          syncImeTokenPicker(curLn, pos)
          return
        }
        const imePick = resolveImeTokenPicker(curLn, pos, completionCandidatesRef.current, {
          emptyFirstPrefixShowsAll: true
        })
        if (imePick && imePick.candidates.length > 0) {
          e.preventDefault()
          tabPressSeqRef.current = 0
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
        !navTextSelDone
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
      paneFocus,
      toggleNavActive
    ]
  )

  /** EN: Controlled `value` fights browser/IME inserts during nav page-field typing. */
  const navPromptValueControlled = !navPageTyping
  const showNavTypingPlaceholder =
    navPageTyping && line.trim() === "" && !isComposing
  const mirror = promptMirrorSegments(line, cursorPos, isComposing, compositionAnchor)
  const iSearchPreview = iSearchMatches[iSearchCycle]
  const shellScrollClassName = `bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`
  const splitPickerLayout = sidePickerOpen

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
        {lines.map((ln, i) => (
          <div key={i} className="bmxt-out-line">
            {ln}
          </div>
        ))}
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
        <div
          className={`bmxt-prompt-line${navPageTyping ? " bmxt-prompt-line--nav-typing" : ""}`}>
          <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
          <div className="bmxt-prompt-field">
            <div className="bmxt-prompt-mirror" aria-hidden>
              <span>{mirror.before}</span>
              {mirror.composition ? (
                <span className="bmxt-prompt-composition">{mirror.composition}</span>
              ) : (
                <span
                  ref={cursorMirrorCellRef}
                  className={`bmxt-cursor-cell${mirror.cur ? "" : " bmxt-cursor-cell--eol"}${terminalPaneActive ? "" : " bmxt-cursor-cell--inactive"}`}>
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
              tabIndex={0}
              aria-label={mode === "isearch" ? "Reverse incremental search" : "Command line"}
              placeholder={
                showNavTypingPlaceholder
                  ? navTypingMultiline
                    ? uiCopy.t("prompt.navTypingMultiline")
                    : uiCopy.t("prompt.navTyping")
                  : showSearchListPatternPlaceholder
                    ? uiCopy.t("prompt.searchListPattern")
                    : mode === "normal" && line.trim() === "" && !searchListBusy
                      ? uiCopy.t("prompt.placeholder")
                      : undefined
              }
              value={navPromptValueControlled ? line : undefined}
              readOnly={searchListBusy}
              onInput={onImeInput}
              onBeforeInput={onBeforeInput}
              onSelect={onImeSelect}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onCompositionStart={onCompositionStart}
              onCompositionUpdate={onCompositionUpdate}
              onCompositionEnd={onCompositionEnd}
            />
            {subCmdPicker && !searchListBusy ? (
              <div
                ref={subCmdPickerHostRef}
                className="bmxt-subcmd-picker-host bmxt-subcmd-picker-host--positioned"
                {...{ [CSP_DYNAMIC_SCOPE_ATTR]: subCmdPickerScopeId }}>
                <TokenPickerPanel model={subCmdPicker} />
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
        <ModeStatusBarStack
          order={modeToolbarOrder}
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
        />
        <div className="bmxt-scroll-anchor" aria-hidden />
    </>
  )

  return (
    <div className="bmxt-shell-root">
      {splitPickerLayout ? (
        <div
          className="bmxt-terminal-split"
          data-bmxt-session-id={sessionId}
          data-bmxt-leaf-focused={isFocusedPane ? "" : undefined}>
          <div
            className={`bmxt-split-terminal-pane${terminalPaneActive ? " bmxt-split-pane--focused" : ""}`}>
            <div ref={scrollRef} className={shellScrollClassName}>
              {shellContent}
            </div>
          </div>
          <SessionPickerColumns
            sessionId={sessionId}
            isFocusedPane={isFocusedPane}
            paneFocus={paneFocus}
            activatePaneFocus={activatePaneFocus}
            tabPicker={tabPicker}
            searchListPicker={searchListPicker}
            domListPicker={domListPicker}
            settingListPicker={settingListPicker}
            uiAppearance={uiSettings.appearance}
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
            onOpenSearchEntry={(entry, matchIndex) =>
              void onOpenSearchPickerEntry(entry, matchIndex)
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
            onTabPickerInteractiveChange={onTabPickerInteractiveChange}
            tabsPageActiveMode={tabsPageActiveMode}
          />
        </div>
      ) : (
        <div
          ref={scrollRef}
          data-bmxt-leaf-focused={isFocusedPane ? "" : undefined}
          className={`${shellScrollClassName}${terminalPaneActive ? " bmxt-split-pane--focused" : ""}`}>
          {shellContent}
        </div>
      )}
    </div>
  )
}
