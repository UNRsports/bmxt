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
import { usePlainPickerKeyboard } from "../hooks/use-plain-picker-keyboard"
import { URL_LIST_COMMAND_LISTING_HINT } from "../interaction/url-list-commands"
import { plainPickerLineHighlightSegments } from "../search/plain-picker-search"
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
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern

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

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: lines.length,
    keyboardActive,
    sessionId,
    enableCommandMode,
    onReturnToPrompt,
    onConfirmLineIndex,
    hi,
    setHi,
    searchMode,
    setSearchMode,
    filterQuery,
    setFilterQuery,
    hlSearchPattern,
    setHlSearchPattern,
    commandMode,
    setCommandMode,
    commandBuffer,
    setCommandBuffer,
    setCommandListingHint,
    matchLines: lines
  })

  const onListScroll = useCallback(() => {
    syncWindowFromScroll()
  }, [syncWindowFromScroll])

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
