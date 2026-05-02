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
import { logBmxtKey } from "../debug/key-log"
import { useSessionLogAndHistory } from "./use-session-log-and-history"
import { matchesForSearch, wordBounds } from "./text-utils"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../wasm-core"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"

export function BmxtTerminal() {
  const {
    lines,
    history,
    appendLogLines,
    appendCommandToHistory
  } = useSessionLogAndHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>(
    []
  )
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
    if (tabPicker) {
      return
    }
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [tabPicker, line, cursorPos, isComposing])

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

      logBmxtKey("prompt", "keydown", {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        mode,
        tabPickerOpen: Boolean(tabPickerRef.current)
      })

      if (tabPickerRef.current) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          logBmxtKey("prompt", "Enter → swallowed (picker/window capture が処理)", {})
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
          logBmxtKey("prompt", "↑↓/jk → swallowed (tab picker)", {})
          return
        }
      }

      if (e.key !== "Tab") {
        tabPressSeqRef.current = 0
      }

      if (mode === "isearch") {
        if (e.key === "Escape") {
          e.preventDefault()
          logBmxtKey("prompt", "Escape → exitISearch", {})
          exitISearch()
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          logBmxtKey("prompt", "Enter → submitLine (isearch)", {})
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
        logBmxtKey("prompt", "Ctrl+R → enterISearch", {})
        enterISearch()
        return
      }

      if (e.key === "Tab") {
        const curLn = lineRef.current
        const pos = cursorRef.current
        const muZone = tabsMoveUrlCompletionZone(curLn, pos)
        if (muZone) {
          e.preventDefault()
          logBmxtKey("prompt", "Tab → tabs -mu URL 補完候補", { prefix: muZone.prefix })
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
          logBmxtKey("prompt", "Tab → 補完スキップ（単語なし）", {})
          return
        }
        const cands = completionCandidatesRef.current.filter((c) =>
          c.startsWith(w)
        )
        if (cands.length === 0) {
          logBmxtKey("prompt", "Tab → 補完候補なし", { word: w })
          return
        }
        const idx = tabPressSeqRef.current % cands.length
        tabPressSeqRef.current += 1
        const rep = cands[idx]!
        logBmxtKey("prompt", "Tab → コマンド補完適用", {
          word: w,
          replacement: rep,
          candidateIndex: idx
        })
        const newLine = curLn.slice(0, l) + rep + curLn.slice(r)
        setHistNavIndex(-1)
        setLine(newLine)
        setCursorPos(l + rep.length)
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        logBmxtKey("prompt", "ArrowUp → history older", {
          histNavIndex,
          historyLen: history.length
        })
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
        logBmxtKey("prompt", "ArrowDown → history newer", { histNavIndex })
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
        logBmxtKey("prompt", "Enter → submitLine", {})
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
