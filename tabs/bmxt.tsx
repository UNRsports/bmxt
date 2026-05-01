import "../bmxt-ui.css"

import {
  buildTabPickerRows,
  listTabsMoveUrlCandidates,
  parseGroupNewInteractiveLine,
  parseTabsListPickerLine,
  resolveInitialTabPickerHighlightIndex,
  TabPickerOverlay,
  tabsMoveUrlCompletionZone,
  type TabPickerRow
} from "../lib/features/tabs"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../lib/features/wasm-core"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"

const LOG_KEY = "bmxt_log"
const HISTORY_KEY = "bmxt_cmd_history"
const MAX_HISTORY = 300
const MAX_LOG_LINES = 500

function matchesForSearch(history: string[], query: string): string[] {
  const newestFirst = [...history].reverse()
  if (!query) {
    return newestFirst
  }
  return newestFirst.filter((ln) => ln.includes(query))
}

function wordBounds(s: string, pos: number): [number, number] {
  let l = pos
  while (l > 0 && !/\s/.test(s[l - 1]!)) {
    l--
  }
  let r = pos
  while (r < s.length && !/\s/.test(s[r]!)) {
    r++
  }
  return [l, r]
}

function IndexBmxtWindow() {
  const [completionCandidates, setCompletionCandidates] = useState<string[]>(
    []
  )
  const [lines, setLines] = useState<string[]>([])
  const [mode, setMode] = useState<"normal" | "isearch">("normal")
  const [line, setLine] = useState("")
  const [cursorPos, setCursorPos] = useState(0)
  const [logScrollable, setLogScrollable] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [tabPicker, setTabPicker] = useState<{
    rows: TabPickerRow[]
    showUrl: boolean
    initialHi: number
    variant?: "default" | "groupNew"
  } | null>(null)
  const tabPickerRef = useRef(tabPicker)
  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])

  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const imeRef = useRef<HTMLTextAreaElement>(null)

  const [history, setHistory] = useState<string[]>([])
  const [histNavIndex, setHistNavIndex] = useState(-1)
  const [histDraft, setHistDraft] = useState("")
  const skipHistResetRef = useRef(false)

  const [iSearchCycle, setISearchCycle] = useState(0)
  const [iSearchSnapshot, setISearchSnapshot] = useState("")

  const tabPressSeqRef = useRef(0)
  const lineRef = useRef("")
  const cursorRef = useRef(0)
  const completionCandidatesRef = useRef<string[]>([])

  useEffect(() => {
    completionCandidatesRef.current = completionCandidates
  }, [completionCandidates])

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
        setCompletionCandidates(getCompletionCandidates())
      } catch {
        setCompletionCandidates(FALLBACK_COMPLETION_CANDIDATES)
      }
    })()
  }, [])

  const iSearchMatches = useMemo(
    () => matchesForSearch(history, mode === "isearch" ? line : ""),
    [history, line, mode]
  )

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

  useEffect(() => {
    chrome.storage.local.get([LOG_KEY, HISTORY_KEY], (r) => {
      setLines((r[LOG_KEY] as string[] | undefined) ?? [])
      setHistory((r[HISTORY_KEY] as string[] | undefined) ?? [])
    })
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      if (changes[LOG_KEY]) {
        setLines((changes[LOG_KEY].newValue as string[] | undefined) ?? [])
      }
      if (changes[HISTORY_KEY]) {
        setHistory((changes[HISTORY_KEY].newValue as string[] | undefined) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useLayoutEffect(() => {
    if (tabPicker) {
      return
    }
    syncLogScroll()
  }, [tabPicker, lines, mode, line, syncLogScroll])

  useEffect(() => {
    if (tabPicker) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => syncLogScroll())
    ro.observe(el)
    return () => ro.disconnect()
  }, [tabPicker, syncLogScroll])

  /** Log buffer grew (new output): keep the active prompt in view like a hardware terminal. */
  useLayoutEffect(() => {
    if (tabPicker) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [tabPicker, lines, syncLogScroll])

  useLayoutEffect(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [line, cursorPos, isComposing])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => imeRef.current?.focus())
  }, [])

  const refreshTabPickerRows = useCallback(async () => {
    const prev = tabPickerRef.current
    if (!prev) {
      return
    }
    try {
      const rows = await buildTabPickerRows(prev.showUrl)
      const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
      setTabPicker({
        rows,
        showUrl: prev.showUrl,
        initialHi,
        variant: prev.variant
      })
    } catch {
      /* keep previous rows */
    }
  }, [])

  const appendLogLines = useCallback(async (newLines: string[]) => {
    const prev = await chrome.storage.local.get(LOG_KEY)
    const arr = [...((prev[LOG_KEY] as string[] | undefined) ?? []), ...newLines].slice(
      -MAX_LOG_LINES
    )
    await chrome.storage.local.set({ [LOG_KEY]: arr })
  }, [])

  useEffect(() => {
    if (tabPicker) {
      return
    }
    focusPrompt()
  }, [tabPicker, focusPrompt])

  useEffect(() => {
    if (tabPicker) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [tabPicker, focusPrompt])

  const appendCommandToHistory = useCallback((cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) {
      return
    }
    setHistory((prev) => {
      const next = [...prev, trimmed].slice(-MAX_HISTORY)
      void chrome.storage.local.set({ [HISTORY_KEY]: next })
      return next
    })
  }, [])

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
    const trimmed = lineRef.current.trim()
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
            "Tab picker — ↑↓ move · Tab # · ←→ move/close/group/new win · / search · Ctrl+Shift+↑↓ active · Enter · Esc"
          ])
          setTabPicker({ rows, showUrl, initialHi })
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
          setTabPicker({ rows, showUrl: false, initialHi, variant: "groupNew" })
        } catch (e) {
          await appendLogLines([
            `> ${trimmed}`,
            `error: ${e instanceof Error ? e.message : String(e)}`
          ])
        }
      })()
      return
    }

    appendCommandToHistory(trimmed)
    setLine("")
    setCursorPos(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    chrome.runtime.sendMessage({ type: "RUN_CMD", line: trimmed }, () => {
      void chrome.runtime.lastError
    })
    focusPrompt()
  }, [
    appendCommandToHistory,
    appendLogLines,
    focusPrompt,
    iSearchCycle,
    iSearchMatches,
    iSearchSnapshot,
    mode
  ])

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
    setLine(ta.value)
    setCursorPos(ta.selectionStart)
  }, [mode])

  const onImeSelect = useCallback(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    setCursorPos(ta.selectionEnd)
  }, [isComposing])

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
    setLine(next)
    setCursorPos(start + t.length)
  }, [mode])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
        return
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
        if (e.key === "ArrowUp") {
          e.preventDefault()
          if (iSearchMatches.length > 0) {
            setISearchCycle((c) => (c - 1 + iSearchMatches.length) % iSearchMatches.length)
          }
          return
        }
        if (e.key === "ArrowDown") {
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
            const newLine = curLn.slice(0, muZone.urlStart) + rep + curLn.slice(muZone.tokenEnd)
            setHistNavIndex(-1)
            setLine(newLine)
            setCursorPos(muZone.urlStart + rep.length)
          })()
          return
        }
        e.preventDefault()
        const [l, r] = wordBounds(curLn, pos)
        const w = curLn.slice(l, r)
        if (!w) {
          return
        }
        const cands = completionCandidatesRef.current.filter((c) =>
          c.startsWith(w)
        )
        if (cands.length === 0) {
          return
        }
        const idx = tabPressSeqRef.current % cands.length
        tabPressSeqRef.current += 1
        const rep = cands[idx]!
        const newLine = curLn.slice(0, l) + rep + curLn.slice(r)
        setHistNavIndex(-1)
        setLine(newLine)
        setCursorPos(l + rep.length)
        return
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
      completionCandidates,
      enterISearch,
      exitISearch,
      histDraft,
      histNavIndex,
      history,
      iSearchMatches,
      mode,
      submitLine
    ]
  )

  const before = line.slice(0, cursorPos)
  const cur = line[cursorPos] ?? ""
  const after = line.slice(cursorPos + 1)
  const iSearchPreview = iSearchMatches[iSearchCycle]

  return (
    <div
      className="bmxt-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        margin: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 12,
        background: "#0d1117",
        color: "#c9d1d9"
      }}>
      {tabPicker ? (
        <TabPickerOverlay
          rows={tabPicker.rows}
          showUrl={tabPicker.showUrl}
          initialHi={tabPicker.initialHi}
          variant={tabPicker.variant ?? "default"}
          onAppendLog={appendLogLines}
          onRefreshRows={refreshTabPickerRows}
          onExit={() => setTabPicker(null)}
        />
      ) : null}
      <div
        ref={scrollRef}
        className={`bmxt-scroll bmxt-shell ${logScrollable ? "bmxt-scroll--scrollable" : "bmxt-scroll--noscroll"}`}
        style={tabPicker ? { display: "none" } : undefined}>
        {lines.length === 0 ? (
          <div className="bmxt-hint">Type help and press Enter. Tab completes commands.</div>
        ) : (
          lines.map((ln, i) => (
            <div key={i} className="bmxt-out-line">
              {ln}
            </div>
          ))
        )}
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
          <span className="bmxt-prompt-glyph">{mode === "isearch" ? "?" : ">"}</span>
          <div className="bmxt-prompt-field">
            <div className="bmxt-prompt-mirror" aria-hidden>
              <span>{before}</span>
              <span
                className={`bmxt-cursor-cell${cur ? "" : " bmxt-cursor-cell--eol"}`}>
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
              aria-label={mode === "isearch" ? "Reverse incremental search" : "Command line"}
              value={line}
              onChange={onImeInput}
              onSelect={onImeSelect}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(ev) => {
                setIsComposing(false)
                setLine(ev.currentTarget.value)
                setCursorPos(ev.currentTarget.selectionStart)
              }}
            />
          </div>
        </div>
        <div ref={endRef} className="bmxt-scroll-anchor" aria-hidden />
      </div>
    </div>
  )
}

export default IndexBmxtWindow
