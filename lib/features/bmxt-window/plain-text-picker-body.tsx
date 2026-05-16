import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react"
import { tryNavigatePaneStrip } from "./pane-focus-nav"
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
  onExit: () => void
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
  hi
}: {
  index: number
  line: string
  hi: number
}): ReactNode {
  const hiRow = index === hi
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
        <span className="bmxt-plain-picker-row-text">{line || "\u00a0"}</span>
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
  onExit,
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
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

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

  useEffect(() => {
    if (!keyboardActive) {
      return
    }
    const onWin = (ev: KeyboardEvent) => {
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
      if (ev.key === "Escape") {
        ev.preventDefault()
        onExit()
      }
    }
    window.addEventListener("keydown", onWin, true)
    return () => window.removeEventListener("keydown", onWin, true)
  }, [keyboardActive, onExit, sessionId])

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
      if (e.key === "Escape") {
        e.preventDefault()
        onExit()
        return
      }
      if (lines.length === 0) {
        return
      }
      const n = lines.length
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setHi((h) => Math.min(h + 1, n - 1))
        return
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setHi((h) => Math.max(h - 1, 0))
      }
    },
    [keyboardActive, lines.length, onExit]
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
      slice.push(<PlainTextPickerRow key={i} index={i} line={lines[i]!} hi={hi} />)
    }
    return slice
  }

  const totalHeight = useVirtual ? lines.length * effectiveRowHeight : undefined
  const virtualStart = useVirtual ? windowRange.start : 0
  const virtualEnd = useVirtual ? windowRange.end : lines.length

  return (
    <div
      className="bmxt-tab-picker"
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
        readOnly
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label="Plain picker keys / ピッカー操作"
        value=""
        onKeyDown={onInputKeyDown}
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
    </div>
  )
}
