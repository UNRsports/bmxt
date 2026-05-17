import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react"
import { PickerCommandFooter } from "../chrome/picker-command-footer"
import { PickerSearchFooter } from "../chrome/picker-search-footer"
import { useWindowKeydownCapture } from "../hooks/use-window-keydown-capture"
import {
  filterUrlListCommandCompletions,
  URL_LIST_COMMAND_LISTING_HINT
} from "../interaction/url-list-commands"
import { verticalNavDirection } from "../interaction/picker-vertical-nav"
import { tryNavigatePaneStrip } from "../panel/pane-focus-nav"
import {
  plainPickerHiIndicesMatching,
  plainPickerLineHighlightSegments
} from "../search/plain-picker-search"
import {
  computePlainPickerWindow,
  PLAIN_PICKER_ROW_HEIGHT_FALLBACK,
  PLAIN_PICKER_VIRTUALIZE_MIN,
  scrollTopForPlainPickerIndex
} from "./plain-text-picker-virtual"

export type PlainTextPickerBodyProps = {
  /** EN: One line under the chrome (same slot as tab picker headline). */
  headline: string
  /** EN: Each string is one logical row (same row chrome as tab rows). */
  lines: string[]
  /** EN: Esc at top level — return focus to BMXt prompt; picker stays open. */
  onReturnToPrompt: () => void
  /** EN: Enter on highlighted row (normal mode). */
  onConfirmLineIndex?: (index: number) => void
  /** EN: Enable `:` command mode (`nohlsearch`, …). */
  enableCommandMode?: boolean
  /** EN: When false, display-only (no key capture / autofocus). */
  keyboardActive?: boolean
  /** EN: Optional sink for the hidden IME textarea (pane focus navigation). */
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

const ROW_ID_PREFIX = "bmxt-plain-row"

function PlainTextPickerRow({
  index,
  line,
  hi,
  searchHighlightQuery
}: {
  index: number
  line: string
  hi: number
  searchHighlightQuery: string
}): ReactNode {
  const hiRow = index === hi
  const segments = plainPickerLineHighlightSegments(line, searchHighlightQuery)
  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={`bmxt-tab-picker-row bmxt-tab-picker-row--tab${
        hiRow ? " bmxt-tab-picker-row--hi" : ""
      }`}>
      <div className="bmxt-tab-picker-tab-title">
        <span className="bmxt-tab-picker-tab-glyph"> </span>
        <span className="bmxt-tab-picker-tab-glyph"> </span>
        <span className="bmxt-plain-picker-row-text">
          {segments.map((seg, i) =>
            seg.match ? (
              <mark key={i} className="bmxt-tab-picker-search-hl">
                {seg.text || "\u00a0"}
              </mark>
            ) : (
              <span key={i}>{seg.text || "\u00a0"}</span>
            )
          )}
        </span>
      </div>
    </div>
  )
}

/**
 * EN: Read-only list using the same DOM/CSS as `TabPickerOverlay` (shared chrome with tabs mode).
 * JA: `TabPickerOverlay` と同一の `bmxt-tab-picker` 系クラスで読み取り専用リストを出す（tabs と共有）。
 */
export function PlainTextPickerBody({
  headline,
  lines,
  onReturnToPrompt,
  onConfirmLineIndex,
  enableCommandMode = false,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: PlainTextPickerBodyProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )
  const listRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [hi, setHi] = useState(0)
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)
  const commandCompletionRef = useRef<{
    base: string
    completions: string[]
    idx: number
  } | null>(null)
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern

  const closeSearch = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
  }, [])

  const useVirtual = lines.length >= PLAIN_PICKER_VIRTUALIZE_MIN
  const effectiveRowHeight = rowHeight ?? PLAIN_PICKER_ROW_HEIGHT_FALLBACK

  const syncWindowFromScroll = useCallback(() => {
    const list = listRef.current
    if (!list || !useVirtual || lines.length === 0) {
      return
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        lines.length,
        effectiveRowHeight
      )
    )
  }, [effectiveRowHeight, lines.length, useVirtual])

  useEffect(() => {
    setHi(0)
    setSearchMode(false)
    setFilterQuery("")
    setHlSearchPattern("")
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
    commandCompletionRef.current = null
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [lines])

  useEffect(() => {
    if (lines.length === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lines.length - 1))
  }, [lines.length])

  useLayoutEffect(() => {
    const probe = measureRef.current
    if (!probe) {
      return
    }
    const h = probe.getBoundingClientRect().height
    if (h > 0) {
      setRowHeight(h)
    }
  }, [lines.length])

  useLayoutEffect(() => {
    if (!useVirtual) {
      if (lines.length === 0) {
        return
      }
      document.getElementById(`${ROW_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
      return
    }
    const list = listRef.current
    if (!list) {
      return
    }
    const nextTop = scrollTopForPlainPickerIndex(
      list.scrollTop,
      list.clientHeight,
      hi,
      effectiveRowHeight
    )
    if (nextTop !== list.scrollTop) {
      list.scrollTop = nextTop
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        lines.length,
        effectiveRowHeight
      )
    )
  }, [effectiveRowHeight, hi, lines.length, useVirtual])

  useLayoutEffect(() => {
    if (!useVirtual) {
      return
    }
    syncWindowFromScroll()
  }, [useVirtual, syncWindowFromScroll, effectiveRowHeight, lines.length])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    }
  }, [keyboardActive])

  const runPickerVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const n = lines.length
      if (n === 0) {
        return false
      }
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => Math.min(h + 1, n - 1))
        return true
      }
      if (dir === "up") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => Math.max(h - 1, 0))
        return true
      }
      return false
    },
    [keyboardActive, lines.length]
  )

  const runPickerCommandEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || !enableCommandMode || !commandMode) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      if (commandBuffer.trim().toLowerCase() === "nohlsearch") {
        setHlSearchPattern("")
        setSearchMode(false)
        setFilterQuery("")
      }
      commandCompletionRef.current = null
      setCommandMode(false)
      setCommandBuffer("")
      setCommandListingHint(false)
      return true
    },
    [commandBuffer, commandMode, enableCommandMode, keyboardActive]
  )

  const runPickerNormalEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || searchMode || commandMode) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }
      if (!onConfirmLineIndex || lines.length === 0) {
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      onConfirmLineIndex(hi)
      return true
    },
    [commandMode, hi, keyboardActive, lines.length, onConfirmLineIndex, searchMode]
  )

  const runPickerSearchJump = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || searchMode || commandMode) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      if (hlSearchPattern === "") {
        return false
      }
      let forward: boolean
      if (e.key === "n" && !e.shiftKey) {
        forward = true
      } else if (e.key === "N" && e.shiftKey) {
        forward = false
      } else {
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      const matches = plainPickerHiIndicesMatching(lines, hlSearchPattern)
      if (matches.length === 0) {
        return true
      }
      let target: number
      if (forward) {
        const nextAhead = matches.find((i) => i > hi)
        target = nextAhead ?? matches[0]!
      } else {
        let prevBehind: number | undefined
        for (const i of matches) {
          if (i < hi) {
            prevBehind = i
          } else {
            break
          }
        }
        target = prevBehind ?? matches[matches.length - 1]!
      }
      if (target !== hi) {
        setHi(target)
      }
      return true
    },
    [hi, hlSearchPattern, keyboardActive, lines, searchMode]
  )

  const runPickerSearchEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || !searchMode) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      setHlSearchPattern(filterQuery)
      setSearchMode(false)
      setFilterQuery("")
      return true
    },
    [filterQuery, keyboardActive, searchMode]
  )

  const onWindowKeydownCapture = useCallback(
    (ev: KeyboardEvent) => {
      if (!keyboardActive) {
        return
      }
      if (ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && sessionId) {
        const horiz =
          ev.key === "ArrowLeft" || ev.code === "ArrowLeft"
            ? "left"
            : ev.key === "ArrowRight" || ev.code === "ArrowRight"
              ? "right"
              : null
        if (horiz && tryNavigatePaneStrip(sessionId, horiz)) {
          ev.preventDefault()
          ev.stopImmediatePropagation()
          return
        }
      }
      if (runPickerVerticalNav(ev)) {
        return
      }
      if (runPickerSearchJump(ev)) {
        return
      }
      if (runPickerSearchEnter(ev)) {
        return
      }
      if (runPickerCommandEnter(ev)) {
        return
      }
      if (runPickerNormalEnter(ev)) {
        return
      }
      if (ev.key === "Escape") {
        ev.preventDefault()
        ev.stopPropagation()
        if (commandMode) {
          commandCompletionRef.current = null
          setCommandMode(false)
          setCommandBuffer("")
          setCommandListingHint(false)
          return
        }
        if (searchMode) {
          closeSearch()
          return
        }
        onReturnToPrompt()
      }
    },
    [
      closeSearch,
      commandMode,
      keyboardActive,
      onReturnToPrompt,
      runPickerCommandEnter,
      runPickerNormalEnter,
      runPickerSearchEnter,
      runPickerSearchJump,
      runPickerVerticalNav,
      searchMode,
      sessionId
    ]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  const onListScroll = useCallback(() => {
    syncWindowFromScroll()
  }, [syncWindowFromScroll])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive) {
        return
      }
      if (e.nativeEvent.isComposing) {
        return
      }
      if (runPickerVerticalNav(e.nativeEvent)) {
        return
      }
      if (runPickerSearchJump(e.nativeEvent)) {
        return
      }
      if (runPickerSearchEnter(e.nativeEvent)) {
        return
      }
      if (runPickerCommandEnter(e.nativeEvent)) {
        return
      }
      if (runPickerNormalEnter(e.nativeEvent)) {
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        if (commandMode) {
          commandCompletionRef.current = null
          setCommandMode(false)
          setCommandBuffer("")
          setCommandListingHint(false)
          return
        }
        if (searchMode) {
          closeSearch()
          return
        }
        onReturnToPrompt()
        return
      }
      if (
        enableCommandMode &&
        e.key === ":" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !searchMode &&
        !commandMode
      ) {
        e.preventDefault()
        setCommandMode(true)
        setCommandBuffer("")
        setCommandListingHint(false)
        return
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !commandMode) {
        e.preventDefault()
        if (!searchMode) {
          setSearchMode(true)
        }
        return
      }
      if (commandMode && e.key === "Tab") {
        e.preventDefault()
        if (commandBuffer.trim() === "") {
          setCommandListingHint(true)
        }
        if (commandCompletionRef.current === null) {
          const base = commandBuffer
          const candidates = filterUrlListCommandCompletions(base)
          if (candidates.length === 0) {
            return
          }
          commandCompletionRef.current = { base, completions: candidates, idx: 0 }
        }
        const { completions, idx } = commandCompletionRef.current
        setCommandBuffer(completions[idx % completions.length]!)
        commandCompletionRef.current = { ...commandCompletionRef.current, idx: idx + 1 }
        return
      }
      if (commandMode && e.key !== "Tab") {
        commandCompletionRef.current = null
      }
      if (!searchMode && !commandMode && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
      }
    },
    [
      closeSearch,
      commandBuffer,
      commandMode,
      enableCommandMode,
      keyboardActive,
      onReturnToPrompt,
      runPickerCommandEnter,
      runPickerNormalEnter,
      runPickerSearchEnter,
      runPickerSearchJump,
      runPickerVerticalNav,
      searchMode
    ]
  )

  const activeRowId =
    lines.length > 0 && hi >= 0 && hi < lines.length ? `${ROW_ID_PREFIX}-${hi}` : undefined

  const refocusIfNoSelection = useCallback(() => {
    if (!keyboardActive) {
      return
    }
    const sel = window.getSelection()
    if (!sel || sel.toString().length === 0) {
      inputRef.current?.focus()
    }
  }, [keyboardActive])

  const renderRows = (start: number, end: number) => {
    const slice: ReactNode[] = []
    for (let i = start; i < end; i++) {
      slice.push(
        <PlainTextPickerRow
          key={i}
          index={i}
          line={lines[i]!}
          hi={hi}
          searchHighlightQuery={searchHighlightQuery}
        />
      )
    }
    return slice
  }

  const totalHeight = useVirtual ? lines.length * effectiveRowHeight : undefined
  const virtualStart = useVirtual ? windowRange.start : 0
  const virtualEnd = useVirtual ? windowRange.end : lines.length

  return (
    <div
      className="bmxt-tab-picker bmxt-side-picker"
      onMouseDown={(e) => {
        if (!keyboardActive) {
          return
        }
        const t = e.target as HTMLElement | null
        if (t && t.closest(".bmxt-plain-picker-row-text")) {
          return
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      }}
      onMouseUp={refocusIfNoSelection}>
      <div className="bmxt-tab-picker-head">{headline}</div>
      <textarea
        ref={setInputEl}
        className="bmxt-tab-picker-filter-ime"
        rows={1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={
          searchMode ? "Search highlight" : commandMode ? "Command input" : "Plain picker keys / ピッカー操作"
        }
        value={searchMode ? filterQuery : commandMode ? commandBuffer : ""}
        onChange={(e) => {
          if (searchMode) {
            setFilterQuery(e.target.value)
          } else if (commandMode) {
            setCommandBuffer(e.target.value)
          }
        }}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={(e) => {
          if (searchMode) {
            setFilterQuery(e.currentTarget.value)
          } else if (commandMode) {
            setCommandBuffer(e.currentTarget.value)
          }
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        ref={listRef}
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Results"
        aria-activedescendant={activeRowId}
        onScroll={useVirtual ? onListScroll : undefined}>
        {lines.length >= PLAIN_PICKER_VIRTUALIZE_MIN ? (
          <div
            ref={measureRef}
            className="bmxt-tab-picker-row bmxt-tab-picker-row--tab"
            aria-hidden
            style={{
              position: "absolute",
              visibility: "hidden",
              pointerEvents: "none",
              left: 0,
              right: 0
            }}>
            <div className="bmxt-tab-picker-tab-title">
              <span className="bmxt-tab-picker-tab-glyph"> </span>
              <span className="bmxt-tab-picker-tab-glyph"> </span>
              <span className="bmxt-plain-picker-row-text">{"\u00a0"}</span>
            </div>
          </div>
        ) : null}
        {lines.length === 0 ? (
          <div className="bmxt-tab-picker-empty">(no output)</div>
        ) : useVirtual ? (
          <div
            className="bmxt-plain-picker-virtual-track"
            style={{ height: totalHeight }}>
            <div
              className="bmxt-plain-picker-virtual-window"
              style={{ transform: `translateY(${virtualStart * effectiveRowHeight}px)` }}>
              {renderRows(virtualStart, virtualEnd)}
            </div>
          </div>
        ) : (
          renderRows(0, lines.length)
        )}
      </div>
      {searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <PickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={URL_LIST_COMMAND_LISTING_HINT}
          ambiguousPlaceholder={null}
        />
      ) : null}
    </div>
  )
}
