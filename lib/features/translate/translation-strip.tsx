import { useCallback, useEffect, useMemo, useRef } from "react"
import type { TranslationTriplet } from "./translator-service"
import { lineIndicesFromSelection, sentenceIndicesFromSelection } from "./sentence-highlight"
import { buildTranslateLineRows } from "./translation-segments"

export type TranslationBlock = TranslationTriplet & {
  id: number
  start: number
  end: number
}

const PENDING_TEXT = "…"

export type SentenceHighlightProps = {
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
  onSentenceSelect?: (blockIndex: number) => void
}

type Props = {
  blocks: readonly TranslationBlock[]
  busy: boolean
  statusNote: string | null
  /** EN: Keep the two-section shell visible even before the first translation. */
  alwaysVisible?: boolean
  sentenceHighlight?: SentenceHighlightProps
}

function joinField(blocks: readonly TranslationBlock[], field: keyof TranslationTriplet): string {
  return blocks
    .map((b) => b[field])
    .filter((line) => line.length > 0)
    .join("\n")
}

function displayText(value: string, pending: boolean): string {
  if (value) {
    return value
  }
  return pending ? PENDING_TEXT : ""
}

function PlainSection({ label, text }: { label: string; text: string }) {
  return (
    <section className="bmxt-typing-translate-section">
      <div className="bmxt-typing-translate-heading">{label}</div>
      <div className="bmxt-typing-translate-body">{text}</div>
    </section>
  )
}

export function TranslateHighlightPanel({
  label,
  buffer,
  blocks,
  field,
  busy,
  highlightedLineIndices,
  onHighlightedLineIndicesChange,
  onLineSelect,
  panelLayout = false
}: {
  label: string
  buffer: string
  blocks: readonly TranslationBlock[]
  field: "forward" | "back"
  busy: boolean
  highlightedLineIndices: ReadonlySet<number>
  onHighlightedLineIndicesChange: (indices: ReadonlySet<number>) => void
  onLineSelect?: (lineIndex: number) => void
  panelLayout?: boolean
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(
    () => buildTranslateLineRows(buffer, blocks, field, busy),
    [buffer, blocks, busy, field]
  )

  const applyHighlight = useCallback(
    (indices: readonly number[]) => {
      onHighlightedLineIndicesChange(new Set(indices))
      if (indices.length === 1) {
        onLineSelect?.(indices[0]!)
      }
    },
    [onHighlightedLineIndicesChange, onLineSelect]
  )

  const onMouseUp = useCallback(() => {
    applyHighlight(lineIndicesFromSelection(bodyRef.current))
  }, [applyHighlight])

  const onLineClick = useCallback(
    (lineIndex: number) => {
      applyHighlight([lineIndex])
    },
    [applyHighlight]
  )

  useEffect(() => {
    if (highlightedLineIndices.size === 0) {
      return
    }
    const firstIndex = Math.min(...highlightedLineIndices)
    const el = bodyRef.current?.querySelector(`[data-line-index="${firstIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightedLineIndices])

  const sectionClass = panelLayout
    ? "bmxt-translate-editor-panel"
    : "bmxt-typing-translate-section"
  const headingClass = panelLayout
    ? "bmxt-translate-editor-panel-heading"
    : "bmxt-typing-translate-heading"
  const bodyClass = panelLayout
    ? "bmxt-translate-editor-panel-body bmxt-typing-translate-body bmxt-typing-translate-body-sentences"
    : "bmxt-typing-translate-body bmxt-typing-translate-body-sentences"

  return (
    <section className={sectionClass}>
      <div className={headingClass}>{label}</div>
      <div ref={bodyRef} className={bodyClass} onMouseUp={onMouseUp}>
        {rows.length === 0 ? (
          <span className="bmxt-translate-line">{busy ? PENDING_TEXT : ""}</span>
        ) : (
          rows.map((row) => {
            const highlighted = highlightedLineIndices.has(row.lineIndex)
            return (
              <span
                key={`line-${row.lineIndex}`}
                data-line-index={row.lineIndex}
                className={
                  highlighted
                    ? "bmxt-translate-line bmxt-translate-sentence-highlight"
                    : "bmxt-translate-line"
                }
                onClick={() => onLineClick(row.lineIndex)}>
                {row.displayText}
              </span>
            )
          })
        )}
      </div>
    </section>
  )
}

function TranslateHighlightPanelLegacy({
  label,
  blocks,
  field,
  busy,
  highlightedIndices,
  onHighlightedIndicesChange,
  onSentenceSelect,
  panelLayout = false
}: {
  label: string
  blocks: readonly TranslationBlock[]
  field: "forward" | "back"
  busy: boolean
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
  onSentenceSelect?: (blockIndex: number) => void
  panelLayout?: boolean
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  const applyHighlight = useCallback(
    (indices: readonly number[]) => {
      onHighlightedIndicesChange(new Set(indices))
      if (indices.length === 1) {
        onSentenceSelect?.(indices[0]!)
      }
    },
    [onHighlightedIndicesChange, onSentenceSelect]
  )

  const onMouseUp = useCallback(() => {
    applyHighlight(sentenceIndicesFromSelection(bodyRef.current))
  }, [applyHighlight])

  const onSentenceClick = useCallback(
    (index: number) => {
      applyHighlight([index])
    },
    [applyHighlight]
  )

  const sectionClass = panelLayout
    ? "bmxt-translate-editor-panel"
    : "bmxt-typing-translate-section"
  const headingClass = panelLayout
    ? "bmxt-translate-editor-panel-heading"
    : "bmxt-typing-translate-heading"
  const bodyClass = panelLayout
    ? "bmxt-translate-editor-panel-body bmxt-typing-translate-body bmxt-typing-translate-body-sentences"
    : "bmxt-typing-translate-body bmxt-typing-translate-body-sentences"

  return (
    <section className={sectionClass}>
      <div className={headingClass}>{label}</div>
      <div ref={bodyRef} className={bodyClass} onMouseUp={onMouseUp}>
        {blocks.length === 0 ? (
          <span className="bmxt-translate-line">{busy ? PENDING_TEXT : ""}</span>
        ) : (
          blocks.map((block, index) => {
            const text = displayText(block[field], busy && !block[field])
            const highlighted = highlightedIndices.has(index)
            return (
              <span
                key={block.id}
                data-sentence-index={index}
                className={
                  highlighted
                    ? "bmxt-translate-line bmxt-translate-sentence-highlight"
                    : "bmxt-translate-line"
                }
                onClick={() => onSentenceClick(index)}>
                {text}
              </span>
            )
          })
        )}
      </div>
    </section>
  )
}

export function TranslationStrip({
  blocks,
  busy,
  statusNote,
  alwaysVisible = false,
  sentenceHighlight
}: Props) {
  if (!alwaysVisible && blocks.length === 0 && !busy && !statusNote) {
    return null
  }

  const forward = displayText(joinField(blocks, "forward"), busy)
  const back = displayText(joinField(blocks, "back"), busy)

  return (
    <div className="bmxt-typing-translate" role="region" aria-label="Translation assist">
      {statusNote ? (
        <div className="bmxt-typing-translate-status" role="status">
          {statusNote}
        </div>
      ) : null}
      {sentenceHighlight ? (
        <>
          <TranslateHighlightPanelLegacy
            label="訳"
            blocks={blocks}
            field="forward"
            busy={busy}
            highlightedIndices={sentenceHighlight.highlightedIndices}
            onHighlightedIndicesChange={sentenceHighlight.onHighlightedIndicesChange}
            onSentenceSelect={sentenceHighlight.onSentenceSelect}
          />
          <div className="bmxt-typing-translate-rule" aria-hidden />
          <TranslateHighlightPanelLegacy
            label="再訳"
            blocks={blocks}
            field="back"
            busy={busy}
            highlightedIndices={sentenceHighlight.highlightedIndices}
            onHighlightedIndicesChange={sentenceHighlight.onHighlightedIndicesChange}
            onSentenceSelect={sentenceHighlight.onSentenceSelect}
          />
        </>
      ) : (
        <>
          <PlainSection label="訳" text={forward} />
          <div className="bmxt-typing-translate-rule" aria-hidden />
          <PlainSection label="再訳" text={back} />
        </>
      )}
    </div>
  )
}
