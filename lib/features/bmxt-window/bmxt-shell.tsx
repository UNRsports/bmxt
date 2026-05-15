import { continuationPromptAfterLoneFirstToken } from "../builtin-commands/command-subcommands.gen"
import { resolveImeTokenPicker } from "../command-line/ime-token-picker"
import {
  buildTabPickerRows,
  listTabsMoveUrlCandidates,
  parseGroupNewInteractiveLine,
  parseTabsListPickerLine,
  resolveInitialTabPickerHighlightIndex,
  TabPickerOverlay,
  tabsMoveUrlCompletionZone,
  type TabPickerRow
} from "../tabs"
import { TokenPickerPanel, type TokenPickerModel } from "./token-picker-panel"
import { FindListPickerOverlay } from "../find/find-list-picker-overlay"
import {
  FIND_LIST_PATTERN_PLACEHOLDER,
  isFindListAwaitingScope,
  isFindListReadyToRun,
  parseFindListPickerLine,
  shouldShowFindListPatternPlaceholder,
  type FindListPickerState
} from "../find/find-list-picker-input"
import { DomListPickerOverlay } from "../dom/dom-list-picker-overlay"
import {
  isRetryableDomListOutput,
  parseDomListPickerLine,
  type DomListPickerState
} from "../dom/dom-list-picker-input"
import { logBmxtKey } from "../debug/key-log"
import { matchesForSearch } from "./text-utils"
import {
  applyChromeEffects,
  type DispatchChromeContext
} from "../dispatch"
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

export type TabPickerState = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
}

/** EN: Delay before showing find -list progress spinner (avoid flash on fast runs). */
const FIND_LIST_SPINNER_DELAY_MS = 450

function shouldAutoSubmitAfterTokenPick(trimmed: string): boolean {
  return (
    parseDomListPickerLine(trimmed) !== null ||
    parseTabsListPickerLine(trimmed) !== null ||
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
  tabPicker: TabPickerState | null
  /** 第1引数でセッションを固定（非同期完了後も正しいターミナルに紐づく）。 */
  setTabPicker: (forSessionId: string, v: TabPickerState | null) => void
  findListPicker: FindListPickerState | null
  setFindListPicker: (forSessionId: string, v: FindListPickerState | null) => void
  domListPicker: DomListPickerState | null
  setDomListPicker: (forSessionId: string, v: DomListPickerState | null) => void
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
  tabPicker,
  setTabPicker,
  findListPicker,
  setFindListPicker,
  domListPicker,
  setDomListPicker,
  refreshTabPickerRows,
  postUpgradeBanner
}: Props) {
  const tabPickerOpen = tabPicker !== null
  const overlayOpen = tabPickerOpen || findListPicker !== null || domListPicker !== null
  const tabPickerRef = useRef<TabPickerState | null>(null)
  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])
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
  const completionCandidatesRef = useRef<string[]>([])
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

  const syncImeTokenPicker = useCallback(
    (ln: string, pos: number) => {
      if (mode === "isearch" || overlayOpen || findListBusyRef.current) {
        setSubCmdPicker(null)
        return
      }
      const resolved = resolveImeTokenPicker(ln, pos, completionCandidatesRef.current)
      if (!resolved) {
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
    [mode, overlayOpen]
  )

  useEffect(() => {
    if (isComposing) {
      return
    }
    syncImeTokenPicker(line, cursorPos)
  }, [line, cursorPos, isComposing, syncImeTokenPicker])

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
    if (overlayOpen) {
      return
    }
    syncLogScroll()
  }, [overlayOpen, lines, mode, line, syncLogScroll, postUpgradeBanner])

  useEffect(() => {
    if (overlayOpen) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => syncLogScroll())
    ro.observe(el)
    return () => ro.disconnect()
  }, [overlayOpen, syncLogScroll])

  useLayoutEffect(() => {
    if (overlayOpen) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [overlayOpen, lines, syncLogScroll, postUpgradeBanner])

  useLayoutEffect(() => {
    if (overlayOpen) {
      return
    }
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [overlayOpen, line, cursorPos, isComposing])

  useLayoutEffect(() => {
    if (!subCmdPicker || overlayOpen) {
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
  }, [subCmdPickerAnchorEpisode, overlayOpen, line, cursorPos, mode])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => imeRef.current?.focus())
  }, [])

  useLayoutEffect(() => {
    if (overlayOpen || !isFocusedPane) {
      return
    }
    focusPrompt()
  }, [overlayOpen, isFocusedPane, focusPrompt])

  useEffect(() => {
    if (overlayOpen || !isFocusedPane) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [overlayOpen, isFocusedPane, focusPrompt])

  const runDomListAndShow = useCallback(
    async (
      domListLine: string,
      displayLine: string,
      announce: boolean
    ): Promise<void> => {
      try {
        await ensureBmxtCore()
        const bundle = runDispatch(domListLine)
        if (bundle.ty === "lines") {
          await appendLogLines([`> ${displayLine}`, ...(bundle.lines ?? [])])
          setDomListPicker(sessionId, null)
          return
        }
        const ctx: DispatchChromeContext = {
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: sessionId
        }
        const linesOut = await applyChromeEffects(ctx, bundle.effects ?? [])
        if (isRetryableDomListOutput(linesOut)) {
          if (announce) {
            await appendLogLines([
              `> ${displayLine}`,
              "dom -list — permission / target check (Enter=許可 / Esc=拒否)"
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
          await appendLogLines([`> ${displayLine}`, "dom -list — picker (Esc)"])
        }
        setDomListPicker(sessionId, { kind: "lines", lines: linesOut })
      } catch (e) {
        await appendLogLines([
          `> ${displayLine}`,
          `error: ${e instanceof Error ? e.message : String(e)}`
        ])
        setDomListPicker(sessionId, null)
      }
    },
    [appendLogLines, sessionId, setDomListPicker]
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
        const ctx: DispatchChromeContext = {
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: sessionId
        }
        const linesOut = await applyChromeEffects(ctx, bundle.effects ?? [])
        await appendLogLines(["find -list — picker (Esc)"])
        setFindListPicker(sessionId, { lines: linesOut })
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

  const submitLine = useCallback(() => {
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
            "Tab picker — ↑↓ move · Tab # · ←→ move/close/group/new win · / highlight · Ctrl+Shift+↑↓ active · Enter · Esc"
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
            "group new — ↑↓ ハイライト · Tab で選択 · Enter で名前・色 · / 検索 · Esc"
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

    appendCommandToHistory(trimmed)
    const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
    setLine("")
    setCursorPos(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    chrome.runtime.sendMessage(
      { type: "RUN_CMD", line: trimmed, sessionId },
      () => {
        void chrome.runtime.lastError
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
    setTabPicker,
    setFindListPicker,
    runDomListAndShow,
    runFindListSearch,
    syncImeTokenPicker
  ])

  const applyTokenPickIndex = useCallback(
    (idx: number) => {
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
    setMode("normal")
    setLine(iSearchSnapshot)
    setCursorPos(iSearchSnapshot.length)
    setISearchCycle(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [focusPrompt, iSearchSnapshot])

  const enterISearch = useCallback(() => {
    setISearchSnapshot(lineRef.current)
    setMode("isearch")
    setLine("")
    setCursorPos(0)
    setISearchCycle(0)
    tabPressSeqRef.current = 0
    focusPrompt()
  }, [focusPrompt])

  const applyHistoryLine = useCallback((text: string) => {
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
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const t = e.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ")
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
    [mode, syncImeTokenPicker]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
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

      if (tabPickerRef.current) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          return
        }
        const blocksTabPickerNav =
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.code === "ArrowUp" ||
          e.code === "ArrowDown" ||
          e.key === "j" ||
          e.key === "J" ||
          e.key === "k" ||
          e.key === "K"
        if (blocksTabPickerNav) {
          e.preventDefault()
          return
        }
      }

      const subPick = subCmdPickerRef.current
      if (subPick) {
        if (e.key === "Escape") {
          e.preventDefault()
          setSubCmdPicker(null)
          return
        }
        if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            setSubCmdPicker((s) =>
              s ? { ...s, hi: (s.hi - 1 + n) % n } : null
            )
          }
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

      if (e.key === "Tab") {
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
        const imePick = resolveImeTokenPicker(curLn, pos, completionCandidatesRef.current)
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

      if (e.ctrlKey || e.metaKey) {
        if (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          return
        }
      }

      if (e.key === "ArrowUp") {
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

      if (e.key === "ArrowDown") {
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

      if (e.key === "Enter" && !e.shiftKey) {
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
      overlayOpen,
      applyTokenPickIndex,
      promptLine,
      submitLine,
      syncImeTokenPicker,
      tabPicker
    ]
  )

  const before = line.slice(0, cursorPos)
  const cur = line[cursorPos] ?? ""
  const after = line.slice(cursorPos + 1)
  const iSearchPreview = iSearchMatches[iSearchCycle]

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
      <div
        ref={scrollRef}
        className={`bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`}
        style={overlayOpen ? { display: "none" } : undefined}>
        {lines.length === 0 || postUpgradeBanner ? (
          <div className="bmxt-hint">
            Welcome to BMXt! This program is a test version. Development currently
            focuses on behavior with <code>tabs -list</code>.
            <br />
            BMXtへようこそ！本プログラムはテストバージョンです。現在は{" "}
            <code>tabs -list</code> での動作を中心に開発しています。
            <br />
            <br />
            ☕️ Support — This is still a demo in active development. If you are
            interested in BMXt and the future it can bring, you can support
            development with a one-time or monthly contribution.
            <br />
            ☕️ 支援 — いまはまだ開発段階のデモです。 BMXt
            とそれがもたらす未来にご興味があれば、ワンタイム／月額で開発を支援いただけます。
            <br />
            <a
              href="https://buymeacoffee.com/unrsports"
              target="_blank"
              rel="noopener noreferrer">
              Buy Me a Coffee
            </a>
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
        <div className="bmxt-prompt-line">
          {findListShowSpinner ? (
            <span className="bmxt-prompt-spinner" aria-label="Searching" role="status" />
          ) : null}
          <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
          <div className="bmxt-prompt-field">
            <div className="bmxt-prompt-mirror" aria-hidden>
              <span>{before}</span>
              <span
                ref={cursorMirrorCellRef}
                className={`bmxt-cursor-cell${cur ? "" : " bmxt-cursor-cell--eol"}${isFocusedPane ? "" : " bmxt-cursor-cell--inactive"}`}>
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
                showFindListPatternPlaceholder ? FIND_LIST_PATTERN_PLACEHOLDER : undefined
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
                const v = ev.currentTarget.value
                lineRef.current = v
                setLine(v)
                setCursorPos(ev.currentTarget.selectionStart)
                syncImeTokenPicker(v, ev.currentTarget.selectionStart)
              }}
            />
            {subCmdPicker && !overlayOpen && !findListBusy ? (
              <div
                ref={subCmdPickerHostRef}
                className="bmxt-subcmd-picker-host"
                style={subCmdPickerHostStyle}>
                <TokenPickerPanel
                  model={subCmdPicker}
                  onHighlight={(hi) => setSubCmdPicker((s) => (s ? { ...s, hi } : null))}
                  onPickIndex={applyTokenPickIndex}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="bmxt-scroll-anchor" aria-hidden />
      </div>
      {tabPickerOpen && tabPicker ? (
        <div
          className="bmxt-tab-picker-host"
          style={{
            position: "absolute",
            inset: 6,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            background: "#0d1117",
            borderRadius: 8,
            boxShadow:
              "inset 0 0 0 1px #30363d, 0 4px 18px rgba(0, 0, 0, 0.45)"
          }}>
          <TabPickerOverlay
            rows={tabPicker.rows}
            showUrl={tabPicker.showUrl}
            initialHi={tabPicker.initialHi}
            variant={tabPicker.variant ?? "default"}
            onAppendLog={appendLogLines}
            onRefreshRows={refreshTabPickerRows}
            onExit={() => setTabPicker(sessionId, null)}
            isHostPaneFocused={isFocusedPane}
          />
        </div>
      ) : null}
      {findListPicker ? (
        <div
          className="bmxt-find-list-picker-host"
          style={{
            position: "absolute",
            inset: 6,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            background: "#0d1117",
            borderRadius: 8,
            boxShadow:
              "inset 0 0 0 1px #30363d, 0 4px 18px rgba(0, 0, 0, 0.45)"
          }}>
          <FindListPickerOverlay
            lines={findListPicker.lines}
            onExit={() => setFindListPicker(sessionId, null)}
          />
        </div>
      ) : null}
      {domListPicker ? (
        <div
          className="bmxt-dom-list-picker-host"
          style={{
            position: "absolute",
            inset: 6,
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            background: "#0d1117",
            borderRadius: 8,
            boxShadow:
              "inset 0 0 0 1px #30363d, 0 4px 18px rgba(0, 0, 0, 0.45)"
          }}>
          <DomListPickerOverlay
            state={domListPicker}
            onExit={() => setDomListPicker(sessionId, null)}
            onApprove={() => {
              if (domListPicker.kind !== "prompt") {
                return
              }
              const cl = domListPicker.commandLine
              setDomListPicker(sessionId, {
                kind: "lines",
                lines: ["dom -list — retrying after permission grant…"]
              })
              void runDomListAndShow(cl, cl, false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
