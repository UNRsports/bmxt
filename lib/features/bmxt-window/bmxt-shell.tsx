import { continuationPromptAfterLoneFirstToken } from "../builtin-commands/command-subcommands.gen"
import { resolveImeTokenPicker } from "../command-line/ime-token-picker"
import {
  buildTabPickerRows,
  listTabsMoveUrlCandidates,
  parseGroupNewInteractiveLine,
  parseTabsExitListLine,
  parseTabsListPickerLine,
  resolveInitialTabPickerHighlightIndex,
  tabsMoveUrlCompletionZone,
  type TabPickerRow
} from "../tabs"
import { openFindPickerEntry } from "../find/open-find-picker-entry"
import {
  openPickerSlots,
  pickerEntriesFromFindLines,
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
  FIND_LIST_PATTERN_PLACEHOLDER,
  isFindListAwaitingScope,
  isFindListReadyToRun,
  parseFindExitListLine,
  parseFindListPickerLine,
  shouldShowFindListPatternPlaceholder,
  type FindListPickerState
} from "../find/find-list-picker-input"
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
  NAV_TYPING_PLACEHOLDER,
  NAV_TYPING_PLACEHOLDER_MULTILINE,
  NavStatusBar,
  parseNavEnterLine,
  parseNavExitLine,
  useNavMode,
  type NavEnterTypingDetail,
  type NavPositionsByTab
} from "../nav"
import { parseFindDirectDispatchLine } from "../find/find-direct-dispatch"
import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts"
import { logBmxtKey } from "../debug/key-log"
import { matchesForSearch } from "./text-utils"
import {
  applyChromeEffects,
  type DispatchChromeContext
} from "../dispatch"
import type { ChromeEffect } from "../dispatch/effect-types"
import { findPageProgressLabel } from "../find-sources/page-progress"
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
import type { CSSProperties } from "react"
import type { PostUpgradeBanner } from "./use-version-upgrade-banner"

export type { TabPickerState } from "../side-picker/session/tab-picker-state"
import type { TabPickerState } from "../side-picker/session/tab-picker-state"

/** EN: Delay before showing find -list progress spinner (avoid flash on fast runs). */
const FIND_LIST_SPINNER_DELAY_MS = 450

const FIND_PAGE_SCAN_HINT_LINES = [
  "EN: Page scan may take a while when many tabs are open. Ctrl+C cancels.",
  "JA: タブが多いと時間がかかります。Ctrl+C で中断できます。"
] as const

function effectsIncludeFindPage(effects: ChromeEffect[]): boolean {
  return effects.some((e) => e.kind === "find_page")
}

function shouldAutoSubmitAfterTokenPick(trimmed: string): boolean {
  return (
    parseDomListPickerLine(trimmed) !== null ||
    parseNavEnterLine(trimmed) ||
    parseNavExitLine(trimmed) ||
    parseTabsListPickerLine(trimmed) !== null ||
    parseTabsExitListLine(trimmed) ||
    parseFindExitListLine(trimmed) ||
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
  /** マニフェスト更新後の初回起動のみ（ウェルカムと併せて表示）。 */
  postUpgradeBanner: PostUpgradeBanner | null
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
  postUpgradeBanner
}: Props) {
  const tabPicker = sessionPickers.tabs
  const findListPicker = sessionPickers.find
  const domListPicker = sessionPickers.dom
  const setTabPicker = useCallback(
    (forSessionId: string, v: TabPickerState | null) => {
      setSessionPickerSlot(forSessionId, "tabs", v)
    },
    [setSessionPickerSlot]
  )
  const setFindListPicker = useCallback(
    (forSessionId: string, v: FindListPickerState | null) => {
      setSessionPickerSlot(forSessionId, "find", v)
    },
    [setSessionPickerSlot]
  )
  const setDomListPicker = useCallback(
    (forSessionId: string, v: DomListPickerState | null) => {
      setSessionPickerSlot(forSessionId, "dom", v)
    },
    [setSessionPickerSlot]
  )
  /** tabs / find / dom — 左ターミナル・右にピッカー列（複数可）。 */
  const sidePickerOpen =
    tabPicker !== null || findListPicker !== null || domListPicker !== null
  const [paneFocus, setPaneFocus] = useState<PaneFocusTarget>("terminal")
  const paneFocusRef = useRef<PaneFocusTarget>("terminal")
  const isFocusedPaneRef = useRef(isFocusedPane)
  const openPickersRef = useRef<readonly PickerSlotId[]>([])
  const paneStripActionsRef = useRef<PaneStripActions>({
    setFocus: () => {},
    focusTerminal: () => {},
    focusPicker: () => {}
  })
  const tabPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const findPickerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const domPickerInputRef = useRef<HTMLTextAreaElement | null>(null)

  const openPickers = useMemo(
    () => openPickerSlots(sessionPickers),
    [sessionPickers]
  )

  const tabsPickerKeyboardActive = paneFocus === "tabs" && isFocusedPane
  const findPickerKeyboardActive = paneFocus === "find" && isFocusedPane
  const domPickerKeyboardActive = paneFocus === "dom" && isFocusedPane

  useEffect(() => {
    paneFocusRef.current = paneFocus
  }, [paneFocus])

  isFocusedPaneRef.current = isFocusedPane
  openPickersRef.current = openPickers

  useEffect(() => {
    if (paneFocus === "tabs" && tabPicker === null) {
      setPaneFocus("terminal")
    } else if (paneFocus === "find" && findListPicker === null) {
      setPaneFocus("terminal")
    } else if (paneFocus === "dom" && domListPicker === null) {
      setPaneFocus("terminal")
    }
  }, [paneFocus, tabPicker, findListPicker, domListPicker])

  useEffect(() => {
    if (!sidePickerOpen) {
      setPaneFocus("terminal")
    }
  }, [sidePickerOpen])
  const tabPickerRef = useRef<TabPickerState | null>(null)
  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])
  const findListPickerRef = useRef<FindListPickerState | null>(null)
  useEffect(() => {
    findListPickerRef.current = findListPicker
  }, [findListPicker])
  const domListPickerRef = useRef<DomListPickerState | null>(null)
  useEffect(() => {
    domListPickerRef.current = domListPicker
  }, [domListPicker])
  const findListDismissRef = useRef(false)
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
    getTypingBuffer: () => imeRef.current?.value ?? lineRef.current
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
  const [localCompletion, setLocalCompletion] = useState<string[]>(completionCandidates)

  const scrollRef = useRef<HTMLDivElement>(null)
  const imeRef = useRef<HTMLTextAreaElement>(null)
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)
  const [subCmdPickerHostStyle, setSubCmdPickerHostStyle] = useState<CSSProperties>({})

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
  const findListBusyRef = useRef(false)
  const findListSpinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [findListBusy, setFindListBusy] = useState(false)
  const [findListShowSpinner, setFindListShowSpinner] = useState(false)

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
      if (mode === "isearch" || findListBusyRef.current) {
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
    [mode]
  )

  useEffect(() => {
    if (isComposing) {
      return
    }
    syncImeTokenPicker(line, cursorPos)
  }, [line, cursorPos, isComposing, syncImeTokenPicker, localCompletion])

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
      setSubCmdPickerHostStyle({})
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
      setSubCmdPickerHostStyle((prev) => {
        const next: CSSProperties = {
          position: "fixed",
          left,
          top,
          zIndex: 50
        }
        if (
          prev.position === next.position &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.zIndex === next.zIndex
        ) {
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
      lineRef.current = detail.initialValue
      setLine(detail.initialValue)
      setCursorPos(detail.initialValue.length)
      focusPrompt()
    }
    const onExit = () => {
      restoreNavPromptSnap()
      navPromptSnapRef.current = null
    }
    window.addEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
    window.addEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    return () => {
      window.removeEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
      window.removeEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    }
  }, [focusPrompt, restoreNavPromptSnap])

  const pickerInputRefForSlot = useCallback((slot: PickerSlotId) => {
    switch (slot) {
      case "tabs":
        return tabPickerInputRef
      case "find":
        return findPickerInputRef
      case "dom":
        return domPickerInputRef
    }
  }, [])

  const activatePaneFocus = useCallback(
    (target: PaneFocusTarget) => {
      setPaneFocus(target)
      if (target === "terminal") {
        focusPrompt()
      } else {
        pickerInputRefForSlot(target).current?.focus()
      }
    },
    [focusPrompt, pickerInputRefForSlot]
  )

  /** EN: When a picker column newly appears, move pane focus + blue border to match keyboard target. */
  const prevSidePickersOpenRef = useRef({ tabs: false, find: false, dom: false })
  useLayoutEffect(() => {
    const nowTabs = tabPicker !== null
    const nowFind = findListPicker !== null
    const nowDom = domListPicker !== null
    const prev = prevSidePickersOpenRef.current
    prevSidePickersOpenRef.current = { tabs: nowTabs, find: nowFind, dom: nowDom }

    if (!isFocusedPane) {
      return
    }

    let opened: PickerSlotId | null = null
    if (!prev.dom && nowDom) {
      opened = "dom"
    } else if (!prev.find && nowFind) {
      opened = "find"
    } else if (!prev.tabs && nowTabs) {
      opened = "tabs"
    }
    if (opened === null) {
      return
    }

    setPaneFocus(opened)
    requestAnimationFrame(() => {
      pickerInputRefForSlot(opened).current?.focus()
    })
  }, [tabPicker, findListPicker, domListPicker, isFocusedPane, pickerInputRefForSlot])

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
          commandSessionId: sessionId
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
              "dom -list — permission / target check (Enter=許可 / Esc → prompt)"
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
          await appendLogLines([`> ${displayLine}`, "dom -list — picker (Esc → prompt)"])
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
          `error: ${e instanceof Error ? e.message : String(e)}`
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

  const promptLine = useCallback(
    () => imeRef.current?.value ?? lineRef.current,
    []
  )

  const showFindListPatternPlaceholder = useMemo(
    () =>
      !findListBusy &&
      !findListShowSpinner &&
      shouldShowFindListPatternPlaceholder(line, cursorPos),
    [line, cursorPos, findListBusy, findListShowSpinner]
  )

  const runFindListSearch = useCallback(
    async (displayLine: string, findListLine: string) => {
      if (findListBusyRef.current) {
        return
      }
      findListDismissRef.current = false
      findListBusyRef.current = true
      setFindListBusy(true)
      setSubCmdPicker(null)
      setFindListShowSpinner(false)
      if (findListSpinnerTimerRef.current !== null) {
        clearTimeout(findListSpinnerTimerRef.current)
      }
      findListSpinnerTimerRef.current = setTimeout(() => {
        setFindListShowSpinner(true)
      }, FIND_LIST_SPINNER_DELAY_MS)

      try {
        await ensureBmxtCore()
        const bundle = runDispatch(findListLine)
        if (bundle.ty === "lines") {
          await appendLogLines([`> ${displayLine}`, ...(bundle.lines ?? [])])
          return
        }
        await appendLogLines([
          `> ${displayLine}`,
          "find -list — searching (history · bookmarks · pages)…"
        ])
        const effects = bundle.effects ?? []
        if (effectsIncludeFindPage(effects)) {
          await appendLogLines([...FIND_PAGE_SCAN_HINT_LINES])
        }
        const ctx: DispatchChromeContext = {
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: sessionId,
          findPageProgressLabel: findPageProgressLabel(findListLine),
          onFindPageProgress: async (message) => {
            await appendLogLines([message])
          },
          shouldCancelFindPage: () => findListDismissRef.current
        }
        const linesOut = await applyChromeEffects(ctx, effects)
        if (findListDismissRef.current) {
          findListDismissRef.current = false
          if (linesOut.length > 0) {
            await appendLogLines(linesOut)
          }
          return
        }
        await appendLogLines(["find -list — picker (Esc → prompt)"])
        setFindListPicker(sessionId, { entries: pickerEntriesFromFindLines(linesOut) })
      } catch (e) {
        await appendLogLines([
          `> ${displayLine}`,
          `error: ${e instanceof Error ? e.message : String(e)}`
        ])
      } finally {
        if (findListSpinnerTimerRef.current !== null) {
          clearTimeout(findListSpinnerTimerRef.current)
          findListSpinnerTimerRef.current = null
        }
        findListBusyRef.current = false
        setFindListBusy(false)
        setFindListShowSpinner(false)
      }
    },
    [appendLogLines, sessionId, setFindListPicker]
  )

  const runFindDirectDispatch = useCallback(
    async (displayLine: string, dispatchLine: string) => {
      if (findListBusyRef.current) {
        return
      }
      let pageScanBusy = false
      const startPageScanBusy = () => {
        findListDismissRef.current = false
        findListBusyRef.current = true
        setFindListBusy(true)
        setFindListShowSpinner(false)
        if (findListSpinnerTimerRef.current !== null) {
          clearTimeout(findListSpinnerTimerRef.current)
        }
        findListSpinnerTimerRef.current = setTimeout(() => {
          setFindListShowSpinner(true)
        }, FIND_LIST_SPINNER_DELAY_MS)
        pageScanBusy = true
      }
      const stopPageScanBusy = () => {
        if (!pageScanBusy) {
          return
        }
        if (findListSpinnerTimerRef.current !== null) {
          clearTimeout(findListSpinnerTimerRef.current)
          findListSpinnerTimerRef.current = null
        }
        findListBusyRef.current = false
        setFindListBusy(false)
        setFindListShowSpinner(false)
        pageScanBusy = false
      }
      try {
        await ensureBmxtCore()
        await appendLogLines([`> ${displayLine}`])
        const bundle = runDispatch(dispatchLine)
        if (bundle.ty === "lines") {
          const lines = bundle.lines ?? []
          if (lines.length > 0) {
            await appendLogLines(lines)
          }
          return
        }
        const effects = bundle.effects ?? []
        if (effectsIncludeFindPage(effects)) {
          startPageScanBusy()
          await appendLogLines([...FIND_PAGE_SCAN_HINT_LINES])
        }
        const ctx: DispatchChromeContext = {
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: sessionId,
          findPageProgressLabel: findPageProgressLabel(dispatchLine),
          onFindPageProgress: async (message) => {
            await appendLogLines([message])
          },
          shouldCancelFindPage: () => findListDismissRef.current
        }
        const linesOut = await applyChromeEffects(ctx, effects)
        if (linesOut.length > 0) {
          await appendLogLines(linesOut)
        }
      } catch (e) {
        await appendLogLines([`error: ${e instanceof Error ? e.message : String(e)}`])
      } finally {
        stopPageScanBusy()
      }
    },
    [appendLogLines, sessionId]
  )

  const cancelFindPageScan = useCallback(() => {
    if (!findListBusyRef.current || findListDismissRef.current) {
      return
    }
    findListDismissRef.current = true
    void appendLogLines([
      "find — cancelled (Ctrl+C)",
      "JA: ページ走査を中断しました。"
    ])
  }, [appendLogLines])

  const onOpenFindPickerEntry = useCallback(
    async (entry: PickerEntry, matchIndex: number) => {
      const ctx: DispatchChromeContext = {
        clearLog: async () => {},
        exitPane: async () => [],
        listWindows: async () => [],
        focusInfo: async () => [],
        resolveTabArg: async () => undefined,
        commandSessionId: sessionId
      }
      await openFindPickerEntry(entry, matchIndex, ctx, (lines) => appendLogLines(lines))
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
    const trimmed = promptLine().trim()
    if (!trimmed) {
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
          await appendLogLines([
            `> ${trimmed}`,
            "Tab picker — ↑↓ move · Tab # · ←→ move/close/group/new win · / highlight · Ctrl+Shift+↑↓ active · Enter · Esc → prompt"
          ])
          setTabPicker(sessionId, { rows, showUrl, initialHi })
        } catch (e) {
          await appendLogLines([
            `> ${trimmed}`,
            `error: ${e instanceof Error ? e.message : String(e)}`
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
          activatePaneFocus("terminal")
          logLines.push("Tab picker closed.")
        } else {
          logLines.push("Tab picker is not open in this pane.")
        }
        await appendLogLines(logLines)
        focusPrompt()
      })()
      return
    }

    if (parseFindExitListLine(trimmed)) {
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      void (async () => {
        const logLines = [`> ${trimmed}`]
        const wasBusy = findListBusyRef.current
        if (wasBusy) {
          findListDismissRef.current = true
          findListBusyRef.current = false
          setFindListBusy(false)
          setFindListShowSpinner(false)
          if (findListSpinnerTimerRef.current !== null) {
            clearTimeout(findListSpinnerTimerRef.current)
            findListSpinnerTimerRef.current = null
          }
        }
        if (findListPickerRef.current !== null) {
          setFindListPicker(sessionId, null)
          activatePaneFocus("terminal")
          logLines.push("Find list picker closed.")
        } else if (wasBusy) {
          logLines.push("Find list search cancelled.")
        } else {
          logLines.push("Find list picker is not open in this pane.")
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
      void (async () => {
        const canPage = await canScriptHttpHostPages()
        const logLines = [
          `> ${trimmed}`,
          "nav — armed (Alt on prompt toggles page cursor ON/OFF · ↑↓←→ move · Enter click/type · nav -exit to quit)"
        ]
        if (!canPage) {
          logLines.push(
            "warning: http(s) site access was not granted — allow it before Alt ON, or enable site access under chrome://extensions."
          )
        }
        await appendLogLines(logLines)
        focusPrompt()
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
          logLines.push(
            "error: turn nav off with Alt on the prompt first, then run nav -exit.",
            "JA: 先に Alt で nav を OFF にしてから nav -exit を実行してください。"
          )
        } else if (!navArmedRef.current) {
          logLines.push("nav is not armed in this pane.")
        } else {
          await teardownNav()
          navPositionsRef.current = {}
          setNavArmed(false)
          setNavActive(false)
          logLines.push("nav disarmed.")
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
          logLines.push("DOM list picker closed.")
        } else {
          logLines.push("DOM list picker is not open in this pane.")
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
          await appendLogLines([
            `> ${trimmed}`,
            "group new — ↑↓ ハイライト · Tab で選択 · Enter で名前・色 · / 検索 · Esc → prompt"
          ])
          setTabPicker(sessionId, {
            rows,
            showUrl: false,
            initialHi,
            variant: "groupNew"
          })
        } catch (e) {
          await appendLogLines([
            `> ${trimmed}`,
            `error: ${e instanceof Error ? e.message : String(e)}`
          ])
        }
      })()
      return
    }

    const findListLine = parseFindListPickerLine(trimmed)
    if (findListLine !== null) {
      if (findListBusyRef.current) {
        focusPrompt()
        return
      }
      if (isFindListAwaitingScope(trimmed)) {
        appendCommandToHistory(trimmed)
        const next = trimmed.endsWith(" ") ? trimmed : `${trimmed} `
        lineRef.current = next
        setLine(next)
        setCursorPos(next.length)
        setHistNavIndex(-1)
        tabPressSeqRef.current = 0
        queueMicrotask(() => syncImeTokenPicker(next, next.length))
        focusPrompt()
        return
      }
      if (!isFindListReadyToRun(trimmed)) {
        focusPrompt()
        return
      }
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void runFindListSearch(trimmed, findListLine)
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

    const findDirectLine = parseFindDirectDispatchLine(trimmed)
    if (findDirectLine !== null) {
      if (findListBusyRef.current) {
        focusPrompt()
        return
      }
      appendCommandToHistory(trimmed)
      setLine("")
      setCursorPos(0)
      setHistNavIndex(-1)
      tabPressSeqRef.current = 0
      setSubCmdPicker(null)
      void runFindDirectDispatch(trimmed, findDirectLine)
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
            `error: command dispatch failed — ${err.message}`
          ])
          return
        }
        if (response && typeof response === "object" && "ok" in response && response.ok === false) {
          const msg =
            "error" in response && typeof response.error === "string"
              ? response.error
              : "unknown error"
          void appendLogLines([`> ${trimmed}`, `error: ${msg}`])
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
    activatePaneFocus,
    setTabPicker,
    setFindListPicker,
    runDomListAndShow,
    runFindListSearch,
    runFindDirectDispatch,
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
      const addSpace = s.tokenEnd >= cur.length
      const nextLine = addSpace
        ? cur.slice(0, s.tokenStart) + tok + " " + cur.slice(s.tokenEnd)
        : cur.slice(0, s.tokenStart) + tok + cur.slice(s.tokenEnd)
      const nextPos = s.tokenStart + tok.length + (addSpace ? 1 : 0)
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

  const onImeInput = useCallback(() => {
    const ta = imeRef.current
    if (!ta) {
      return
    }
    allowEmptyFirstPickerSyncRef.current = false
    if (skipHistResetRef.current) {
      skipHistResetRef.current = false
    } else {
      setHistNavIndex(-1)
    }
    tabPressSeqRef.current = 0
    if (mode === "isearch") {
      setISearchCycle(0)
    }
    lineRef.current = ta.value
    setLine(ta.value)
    setCursorPos(ta.selectionStart)
    syncImeTokenPicker(ta.value, ta.selectionStart)
  }, [mode, syncImeTokenPicker])

  const onImeSelect = useCallback(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    const pos = ta.selectionEnd
    setCursorPos(pos)
    syncImeTokenPicker(ta.value, pos)
  }, [isComposing, syncImeTokenPicker])

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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (navPageTyping) {
        if (
          !navTypingMultiline &&
          e.key === "Enter" &&
          !e.shiftKey &&
          !e.nativeEvent.isComposing
        ) {
          e.preventDefault()
        }
        return
      }

      if (e.nativeEvent.isComposing) {
        return
      }

      if (
        findListBusyRef.current &&
        e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === "c" || e.key === "C")
      ) {
        e.preventDefault()
        cancelFindPageScan()
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

      const subPick = subCmdPickerRef.current
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
          if (isFindListReadyToRun(trimmed)) {
            setSubCmdPicker(null)
            submitLine()
            return
          }
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
        if (curLn.trim() === "" && !findListBusyRef.current) {
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
          const idx = tabPressSeqRef.current % imePick.candidates.length
          tabPressSeqRef.current += 1
          const rep = imePick.candidates[idx]!
          const addSpace = imePick.tokenEnd >= curLn.length
          const newLine = addSpace
            ? curLn.slice(0, imePick.tokenStart) + rep + " " + curLn.slice(imePick.tokenEnd)
            : curLn.slice(0, imePick.tokenStart) + rep + curLn.slice(imePick.tokenEnd)
          const newPos = imePick.tokenStart + rep.length + (addSpace ? 1 : 0)
          lineRef.current = newLine
          setHistNavIndex(-1)
          setLine(newLine)
          setCursorPos(newPos)
          syncImeTokenPicker(newLine, newPos)
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
      cancelFindPageScan,
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
      navMenuOpen,
      navTextSelPicking,
      navTextSelDone,
      navTextSelPhase,
      paneFocus,
      toggleNavActive
    ]
  )

  const before = line.slice(0, cursorPos)
  const cur = line[cursorPos] ?? ""
  const after = line.slice(cursorPos + 1)
  const iSearchPreview = iSearchMatches[iSearchCycle]
  const shellScrollClassName = `bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`
  const splitPickerLayout = sidePickerOpen

  const shellContent = (
    <>
        {lines.length === 0 || postUpgradeBanner ? (
          <div className="bmxt-hint">
            Welcome to BMXt! This program is a test version. Development currently
            focuses on behavior with <code>tabs -list</code>.
            <br />
            BMXtへようこそ！本プログラムはテストバージョンです。現在は{" "}
            <code>tabs -list</code> での動作を中心に開発しています。
            <br />
            <br />
            Type help and press Enter. Tab completes commands.
          </div>
        ) : null}
        {postUpgradeBanner ? (
          <div className="bmxt-version-upgrade">
            <div className="bmxt-version-upgrade-title">
              ◆バージョンアップ / Version upgrade — {postUpgradeBanner.version}
            </div>
            <div className="bmxt-version-upgrade-notes bmxt-version-upgrade-notes--ja">
              {postUpgradeBanner.ja.map((line, i) => (
                <div key={i}>・{line}</div>
              ))}
            </div>
            <div className="bmxt-version-upgrade-notes bmxt-version-upgrade-notes--en">
              {postUpgradeBanner.en.map((line, i) => (
                <div key={i}>· {line}</div>
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
          {findListShowSpinner ? (
            <span className="bmxt-prompt-spinner" aria-label="Searching" role="status" />
          ) : null}
          <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
          <div className="bmxt-prompt-field">
            <div className="bmxt-prompt-mirror" aria-hidden>
              <span>{before}</span>
              <span
                ref={cursorMirrorCellRef}
                className={`bmxt-cursor-cell${cur ? "" : " bmxt-cursor-cell--eol"}${terminalPaneActive ? "" : " bmxt-cursor-cell--inactive"}`}>
                {cur || "\u00a0"}
              </span>
              <span>{after}</span>
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
                navPageTyping
                  ? navTypingMultiline
                    ? NAV_TYPING_PLACEHOLDER_MULTILINE
                    : NAV_TYPING_PLACEHOLDER
                  : showFindListPatternPlaceholder
                    ? FIND_LIST_PATTERN_PLACEHOLDER
                    : mode === "normal" &&
                        line.trim() === "" &&
                        !findListBusy &&
                        !findListShowSpinner
                      ? "type or use TAB key"
                      : undefined
              }
              value={line}
              readOnly={findListBusy}
              onChange={onImeInput}
              onSelect={onImeSelect}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(ev) => {
                setIsComposing(false)
                allowEmptyFirstPickerSyncRef.current = false
                const v = ev.currentTarget.value
                lineRef.current = v
                setLine(v)
                setCursorPos(ev.currentTarget.selectionStart)
                syncImeTokenPicker(v, ev.currentTarget.selectionStart)
              }}
            />
            {subCmdPicker && !findListBusy ? (
              <div
                ref={subCmdPickerHostRef}
                className="bmxt-subcmd-picker-host"
                style={subCmdPickerHostStyle}>
                <TokenPickerPanel model={subCmdPicker} />
              </div>
            ) : null}
          </div>
        </div>
        <NavStatusBar
          armed={navArmed}
          active={navActive}
          typingMode={navPageTyping}
          typingMultiline={navTypingMultiline}
          menuOpen={navMenuOpen}
          textSelPhase={navTextSelPhase}
          tabTitle={navCurrentTabTitle}
          overlayError={navOverlayError}
        />
        <div className="bmxt-scroll-anchor" aria-hidden />
    </>
  )

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        boxSizing: "border-box",
        position: "relative"
      }}>
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
            findListPicker={findListPicker}
            domListPicker={domListPicker}
            tabsPickerKeyboardActive={tabsPickerKeyboardActive}
            findPickerKeyboardActive={findPickerKeyboardActive}
            domPickerKeyboardActive={domPickerKeyboardActive}
            tabPickerInputRef={tabPickerInputRef}
            findPickerInputRef={findPickerInputRef}
            domPickerInputRef={domPickerInputRef}
            onAppendLog={appendLogLines}
            onRefreshTabPickerRows={refreshTabPickerRows}
            onOpenFindEntry={(entry, matchIndex) => void onOpenFindPickerEntry(entry, matchIndex)}
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
