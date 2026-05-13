import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react"

export type PlainTextPickerBodyProps = {
  /** EN: One line under the chrome (same slot as tab picker headline). */
  headline: string
  /** EN: Each string is one logical row (same row chrome as tab rows). */
  lines: string[]
  onExit: () => void
}

const ROW_ID_PREFIX = "bmxt-plain-row"

/**
 * EN: Read-only list using the same DOM/CSS as `TabPickerOverlay` (shared chrome with tabs mode).
 * JA: `TabPickerOverlay` と同一の `bmxt-tab-picker` 系クラスで読み取り専用リストを出す（tabs と共有）。
 */
export function PlainTextPickerBody({ headline, lines, onExit }: PlainTextPickerBodyProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [hi, setHi] = useState(0)

  useEffect(() => {
    setHi(0)
  }, [lines])

  useEffect(() => {
    if (lines.length === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lines.length - 1))
  }, [lines.length])

  useLayoutEffect(() => {
    if (lines.length === 0) {
      return
    }
    document.getElementById(`${ROW_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [hi, lines.length])

  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onWin = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault()
        onExit()
      }
    }
    window.addEventListener("keydown", onWin, true)
    return () => window.removeEventListener("keydown", onWin, true)
  }, [onExit])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    [lines.length, onExit]
  )

  const activeRowId =
    lines.length > 0 && hi >= 0 && hi < lines.length ? `${ROW_ID_PREFIX}-${hi}` : undefined

  const refocusIfNoSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.toString().length === 0) {
      inputRef.current?.focus()
    }
  }, [])

  return (
    <div
      className="bmxt-tab-picker"
      onMouseDown={(e) => {
        const t = e.target as HTMLElement | null
        // EN: Don't steal focus while the user is starting a drag-selection inside a row.
        // JA: 行内でドラッグ選択を始めるときは textarea にフォーカスを奪わない。
        if (t && t.closest(".bmxt-plain-picker-row-text")) {
          return
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      }}
      onMouseUp={refocusIfNoSelection}>
      <div className="bmxt-tab-picker-head">{headline}</div>
      <textarea
        ref={inputRef}
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
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Results"
        aria-activedescendant={activeRowId}>
        {lines.length === 0 ? (
          <div className="bmxt-tab-picker-empty">(no output)</div>
        ) : (
          lines.map((ln, i) => {
            const hiRow = i === hi
            return (
              <div
                key={i}
                id={`${ROW_ID_PREFIX}-${i}`}
                role="option"
                aria-selected={hiRow}
                className={`bmxt-tab-picker-row bmxt-tab-picker-row--tab${
                  hiRow ? " bmxt-tab-picker-row--hi" : ""
                }`}>
                <div className="bmxt-tab-picker-tab-title">
                  <span className="bmxt-tab-picker-tab-glyph"> </span>
                  <span className="bmxt-tab-picker-tab-glyph"> </span>
                  <span
                    className="bmxt-plain-picker-row-text"
                    style={{ userSelect: "text", cursor: "text" }}>
                    {ln || "\u00a0"}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
