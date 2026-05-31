import { useCallback, useRef } from "react"
import type { TranslationTriplet } from "./translator-service"
import { sentenceIndicesFromSelection } from "./sentence-highlight"

export type TranslationBlock = TranslationTriplet & { id: number }

const PENDING_TEXT = "…"

export type SentenceHighlightProps = {
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
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

function HighlightSection({
  label,
  blocks,
  field,
  busy,
  highlightedIndices,
  onHighlightedIndicesChange
}: {
  label: string
  blocks: readonly TranslationBlock[]
  field: "forward" | "back"
  busy: boolean
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  const onMouseUp = useCallback(() => {
    const indices = sentenceIndicesFromSelection(bodyRef.current)
    onHighlightedIndicesChange(new Set(indices))
  }, [onHighlightedIndicesChange])

  return (
    <section className="bmxt-typing-translate-section">
      <div className="bmxt-typing-translate-heading">{label}</div>
      <div
        ref={bodyRef}
        className="bmxt-typing-translate-body bmxt-typing-translate-body-sentences"
        onMouseUp={onMouseUp}>
        {blocks.length === 0 ? (
          <span className="bmxt-typing-translate-sentence">{busy ? PENDING_TEXT : ""}</span>
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
                    ? "bmxt-typing-translate-sentence bmxt-translate-sentence-highlight"
                    : "bmxt-typing-translate-sentence"
                }>
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
          <HighlightSection
            label="訳"
            blocks={blocks}
            field="forward"
            busy={busy}
            highlightedIndices={sentenceHighlight.highlightedIndices}
            onHighlightedIndicesChange={sentenceHighlight.onHighlightedIndicesChange}
          />
          <div className="bmxt-typing-translate-rule" aria-hidden />
          <HighlightSection
            label="最訳"
            blocks={blocks}
            field="back"
            busy={busy}
            highlightedIndices={sentenceHighlight.highlightedIndices}
            onHighlightedIndicesChange={sentenceHighlight.onHighlightedIndicesChange}
          />
        </>
      ) : (
        <>
          <PlainSection label="訳" text={forward} />
          <div className="bmxt-typing-translate-rule" aria-hidden />
          <PlainSection label="最訳" text={back} />
        </>
      )}
    </div>
  )
}
