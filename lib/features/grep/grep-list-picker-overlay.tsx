import { useEffect, useRef } from "react"

type Props = {
  onExit: () => void
  lines: string[]
}

/**
 * EN: Full-pane picker chrome (same layout idea as tab picker) — results only, no extra form.
 * JA: タブピッカー同型の全画面パネルで結果を表示（コマンドラインとは別）。
 */
export function GrepListPickerOverlay({ onExit, lines }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onExit()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onExit])

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="bmxt-grep-list-picker"
      role="dialog"
      aria-label="grep -list results"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        padding: "10px 12px",
        color: "#e6edf3",
        fontSize: 12,
        lineHeight: 1.45,
        outline: "none",
        boxSizing: "border-box"
      }}>
      <div
        style={{
          flexShrink: 0,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid #30363d",
          color: "#8b949e",
          fontSize: 11
        }}>
        grep -list · Esc で閉じる / close with Esc
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
        }}>
        {lines.length === 0 ? (
          <div style={{ color: "#8b949e" }}>(no output)</div>
        ) : (
          lines.map((ln, i) => (
            <div
              key={i}
              className="bmxt-grep-list-picker-row"
              style={{
                padding: "3px 0",
                borderBottom: "1px solid #21262d",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}>
              {ln || "\u00a0"}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
