import { useCallback, useEffect, useMemo, useRef } from "react"
import { lineIndicesFromSelection, sentenceIndicesFromSelection } from "./sentence-highlight"
import {
  buildTranslateLineRows,
  resolveForwardDisplayText,
  TRANSLATE_PENDING_TEXT
} from "./translation-segments"
import { TranslationPanelHeading } from "./translation-panel-heading"
import {
  getTranslationFieldLabels,
  type BilingualUiLabel,
  type TranslationPairId
} from "./translation-pair"
import type { TranslationResult } from "./translator-service"
import { tTranslate } from "../setting/i18n/ns/translate"
import { useUiSettings } from "../setting/use-ui-settings"

export type TranslationBlock = TranslationResult & {
  id: number
  start: number
  end: number
}

export type SentenceHighlightProps = {
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
  onSentenceSelect?: (blockIndex: number) => void
}

type Props = {
  pairId: TranslationPairId
  /** EN: Source buffer (shown in the prompt / editor input — not duplicated here). */
  buffer: string
  blocks: readonly TranslationBlock[]
  busy: boolean
  translatePending: boolean
  statusNote: string | null
  /** EN: Keep the shell visible even before the first translation. */
  alwaysVisible?: boolean
  sentenceHighlight?: SentenceHighlightProps
}

function PlainSection({
  label,
  text,
  pendingAnimated = false
}: {
  label: BilingualUiLabel
  text: string
  pendingAnimated?: boolean
}) {
  const bodyClass = pendingAnimated
    ? "bmxt-typing-translate-body bmxt-translate-pending"
    : "bmxt-typing-translate-body"
  return (
    <section className="bmxt-typing-translate-section">
      <TranslationPanelHeading label={label} className="bmxt-typing-translate-heading" />
      <div className={bodyClass}>{text}</div>
    </section>
  )
}

export function TranslateHighlightPanel({
  label,
  buffer,
  blocks,
  busy,
  translatePending,
  highlightedLineIndices,
  onHighlightedLineIndicesChange,
  onLineSelect,
  panelLayout = false
}: {
  label: BilingualUiLabel
  buffer: string
  blocks: readonly TranslationBlock[]
  busy: boolean
  translatePending: boolean
  highlightedLineIndices: ReadonlySet<number>
  onHighlightedLineIndicesChange: (indices: ReadonlySet<number>) => void
  onLineSelect?: (lineIndex: number) => void
  panelLayout?: boolean
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(
    () => buildTranslateLineRows(buffer, blocks, busy, translatePending),
    [buffer, blocks, busy, translatePending]
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
    ? "bmxt-translate-editor-panel bmxt-translate-editor-panel--forward"
    : "bmxt-typing-translate-section"
  const headingClass = panelLayout
    ? "bmxt-translate-editor-panel-heading"
    : "bmxt-typing-translate-heading"
  const bodyClass = panelLayout
    ? "bmxt-translate-editor-panel-body bmxt-typing-translate-body bmxt-typing-translate-body-sentences"
    : "bmxt-typing-translate-body bmxt-typing-translate-body-sentences"

  return (
    <section className={sectionClass}>
      <TranslationPanelHeading label={label} className={headingClass} />
      <div ref={bodyRef} className={bodyClass} onMouseUp={onMouseUp}>
        {rows.length === 0 ? (
          <span
            className={
              translatePending
                ? "bmxt-translate-line bmxt-translate-pending"
                : "bmxt-translate-line"
            }>
            {translatePending ? TRANSLATE_PENDING_TEXT : ""}
          </span>
        ) : (
          rows.map((row) => {
            const highlighted = highlightedLineIndices.has(row.lineIndex)
            const pendingClass = row.pending && translatePending ? " bmxt-translate-pending" : ""
            return (
              <span
                key={`line-${row.lineIndex}`}
                data-line-index={row.lineIndex}
                className={
                  highlighted
                    ? `bmxt-translate-line bmxt-translate-sentence-highlight${pendingClass}`
                    : `bmxt-translate-line${pendingClass}`
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
  busy,
  translatePending,
  highlightedIndices,
  onHighlightedIndicesChange,
  onSentenceSelect,
  panelLayout = false
}: {
  label: BilingualUiLabel
  blocks: readonly TranslationBlock[]
  busy: boolean
  translatePending: boolean
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

  const block = blocks[0]
  const text =
    busy && translatePending
      ? TRANSLATE_PENDING_TEXT
      : block?.forward
        ? block.forward
        : ""

  return (
    <section className={sectionClass}>
      <TranslationPanelHeading label={label} className={headingClass} />
      <div ref={bodyRef} className={bodyClass} onMouseUp={onMouseUp}>
        {blocks.length === 0 ? (
          <span
            className={
              translatePending
                ? "bmxt-translate-line bmxt-translate-pending"
                : "bmxt-translate-line"
            }>
            {translatePending ? TRANSLATE_PENDING_TEXT : ""}
          </span>
        ) : (
          blocks.map((entry, index) => {
            const highlighted = highlightedIndices.has(index)
            const pendingClass = translatePending ? " bmxt-translate-pending" : ""
            return (
              <span
                key={entry.id}
                data-sentence-index={index}
                className={
                  highlighted
                    ? `bmxt-translate-line bmxt-translate-sentence-highlight${pendingClass}`
                    : `bmxt-translate-line${pendingClass}`
                }
                onClick={() => onSentenceClick(index)}>
                {index === 0 ? text : ""}
              </span>
            )
          })
        )}
      </div>
    </section>
  )
}

export function TranslationStrip({
  pairId,
  buffer,
  blocks,
  busy,
  translatePending,
  statusNote,
  alwaysVisible = false,
  sentenceHighlight
}: Props) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const fieldLabels = useMemo(() => getTranslationFieldLabels(pairId), [pairId])

  if (!alwaysVisible && buffer.length === 0 && !busy && !statusNote) {
    return null
  }

  const forward = resolveForwardDisplayText(buffer, blocks, busy, translatePending)

  return (
    <div className="bmxt-typing-translate" role="region" aria-label={tTranslate("translate.preview.aria", locale)}>
      {statusNote ? (
        <div className="bmxt-typing-translate-status" role="status">
          {statusNote}
        </div>
      ) : null}
      {sentenceHighlight ? (
        <TranslateHighlightPanelLegacy
          label={fieldLabels.forward}
          blocks={blocks}
          busy={busy}
          translatePending={translatePending}
          highlightedIndices={sentenceHighlight.highlightedIndices}
          onHighlightedIndicesChange={sentenceHighlight.onHighlightedIndicesChange}
          onSentenceSelect={sentenceHighlight.onSentenceSelect}
        />
      ) : (
        <PlainSection
          label={fieldLabels.forward}
          text={forward}
          pendingAnimated={translatePending && forward === TRANSLATE_PENDING_TEXT}
        />
      )}
    </div>
  )
}
