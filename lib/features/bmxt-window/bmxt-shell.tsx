import {
  buildTabPickerRows,
  listTabsOptionCandidates,
  listTabsMoveUrlCandidates,
  parseGroupNewInteractiveLine,
  parseTabsListPickerLine,
  resolveInitialTabPickerHighlightIndex,
  TabPickerOverlay,
  tabsOptionCompletionZone,
  tabsMoveUrlCompletionZone,
  type TabPickerRow
} from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import { logBmxtKey } from "../debug/key-log"
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
  useState,
  type MutableRefObject
} from "react"
import type { PostUpgradeBanner } from "./use-version-upgrade-banner"

export type TabPickerState = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
}

type Props = {
  lines: string[]
  history: string[]
  completionCandidates: string[]
  appendLogLines: (newLines: string[]) => Promise<void>
  appendCommandToHistory: (cmd: string) => void
  tabPicker: TabPickerState | null
  setTabPicker: (v: TabPickerState | null) => void
  tabPickerRef: MutableRefObject<TabPickerState | null>
  refreshTabPickerRows: () => Promise<void>
  /** マニフェスト更新後の初回起動のみ（ウェルカムと併せて表示）。 */
  postUpgradeBanner: PostUpgradeBanner | null
}

const CONTINUATION_PROMPT_BY_COMMAND: Record<string, string> = {
  tabs: "tabs "
}

function continuationPromptFor(trimmed: string): string | null {
  if (trimmed.includes(" ")) {
    return null
  }
  const key = trimmed.toLowerCase()
  return CONTINUATION_PROMPT_BY_COMMAND[key] ?? null
}

export function BmxtShell({
  lines,
  history,
  completionCandidates,
  appendLogLines,
  appendCommandToHistory,
  tabPicker,
  setTabPicker,
  tabPickerRef,
  refreshTabPickerRows,
  postUpgradeBanner
}: Props) {
  const pickerOpen = tabPicker !== null
  const [mode, setMode] = useState<"normal" | "isearch">("normal")
  const [line, setLine] = useState("")
  const [cursorPos, setCursorPos] = useState(0)
  const [logScrollable, setLogScrollable] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [localCompletion, setLocalCompletion] = useState<string[]>(completionCandidates)

  const scrollRef = useRef<HTMLDivElement>(null)
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
    if (pickerOpen) {
      return
    }
    syncLogScroll()
  }, [pickerOpen, lines, mode, line, syncLogScroll, postUpgradeBanner])

  useEffect(() => {
    if (pickerOpen) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    const ro = new ResizeObserver(() => syncLogScroll())
    ro.observe(el)
    return () => ro.disconnect()
  }, [pickerOpen, syncLogScroll])

  useLayoutEffect(() => {
    if (pickerOpen) {
      return
    }
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" })
    requestAnimationFrame(() => syncLogScroll())
  }, [pickerOpen, lines, syncLogScroll, postUpgradeBanner])

  useLayoutEffect(() => {
    if (pickerOpen) {
      return
    }
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [pickerOpen, line, cursorPos, isComposing])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => imeRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!pickerOpen) {
      focusPrompt()
    }
  }, [pickerOpen, focusPrompt])

  useEffect(() => {
    if (pickerOpen) {
      return
    }
    const onWinFocus = () => focusPrompt()
    window.addEventListener("focus", onWinFocus)
    return () => window.removeEventListener("focus", onWinFocus)
  }, [pickerOpen, focusPrompt])

  useTabPickerChromeSync(refreshTabPickerRows, tabPicker !== null)

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
            "Tab picker — ↑↓ move · Tab # · ←→ move/close/group/new win · / highlight · Ctrl+Shift+↑↓ active · Enter · Esc"
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
    const continuationPrompt = continuationPromptFor(trimmed)
    setLine("")
    setCursorPos(0)
    setHistNavIndex(-1)
    tabPressSeqRef.current = 0
    chrome.runtime.sendMessage({ type: "RUN_CMD", line: trimmed }, () => {
      void chrome.runtime.lastError
    })
    if (continuationPrompt) {
      setLine(continuationPrompt)
      setCursorPos(continuationPrompt.length)
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
    setTabPicker
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
      setLine(next)
      setCursorPos(start + t.length)
    },
    [mode]
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
        tabPickerOpen: Boolean(tabPickerRef.current)
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
        const optionZone = tabsOptionCompletionZone(curLn, pos)
        if (optionZone) {
          e.preventDefault()
          const cands = listTabsOptionCandidates(optionZone.prefix)
          if (cands.length === 0) {
            return
          }
          const idx = tabPressSeqRef.current % cands.length
          tabPressSeqRef.current += 1
          const rep = cands[idx]!
          const suffix = optionZone.optionEnd === curLn.length ? " " : ""
          const newLine =
            curLn.slice(0, optionZone.optionStart) + rep + suffix + curLn.slice(optionZone.optionEnd)
          setHistNavIndex(-1)
          setLine(newLine)
          setCursorPos(optionZone.optionStart + rep.length + suffix.length)
          return
        }
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
        e.preventDefault()
        const [l, r] = wordBounds(curLn, pos)
        const w = curLn.slice(l, r)
        if (!w) {
          return
        }
        const cands = completionCandidatesRef.current.filter((c) => c.startsWith(w))
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
      enterISearch,
      exitISearch,
      histDraft,
      histNavIndex,
      history,
      iSearchMatches,
      mode,
      pickerOpen,
      submitLine,
      tabPickerRef
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
        style={pickerOpen ? { display: "none" } : undefined}>
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
              tabIndex={0}
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
        <div className="bmxt-scroll-anchor" aria-hidden />
      </div>
      {pickerOpen && tabPicker ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
            background: "#0d1117"
          }}>
          <TabPickerOverlay
            rows={tabPicker.rows}
            showUrl={tabPicker.showUrl}
            initialHi={tabPicker.initialHi}
            variant={tabPicker.variant ?? "default"}
            onAppendLog={appendLogLines}
            onRefreshRows={refreshTabPickerRows}
            onExit={() => setTabPicker(null)}
            isHostPaneFocused={true}
          />
        </div>
      ) : null}
    </div>
  )
}
