import {
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MutableRefObject,
  type SyntheticEvent,
  type UIEvent
} from "react"
import {
  listCompleteSentenceSpans,
  sentenceIndicesInRange,
  splitBufferForHighlight
} from "./sentence-boundary"
import { indicesToSet } from "./sentence-highlight"

type Props = {
  text: string
  onTextChange: (text: string) => void
  onReturnToPrompt: () => void
  highlightedIndices: ReadonlySet<number>
  onHighlightedIndicesChange: (indices: ReadonlySet<number>) => void
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  keyboardActive?: boolean
  isComposing: boolean
  onCompositionStart: () => void
  onCompositionEnd: () => void
}

export function TranslateSourceInput({
  text,
  onTextChange,
  onReturnToPrompt,
  highlightedIndices,
  onHighlightedIndicesChange,
  pickerInputRef,
  keyboardActive = false,
  isComposing,
  onCompositionStart,
  onCompositionEnd
}: Props) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const sentenceSpans = useMemo(() => listCompleteSentenceSpans(text), [text])
  const mirrorSegments = useMemo(() => splitBufferForHighlight(text), [text])

  const syncHighlightFromTextarea = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const indices = sentenceIndicesInRange(
        sentenceSpans,
        textarea.selectionStart,
        textarea.selectionEnd
      )
      onHighlightedIndicesChange(indicesToSet(indices))
    },
    [onHighlightedIndicesChange, sentenceSpans]
  )

  const assignTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (pickerInputRef) {
        pickerInputRef.current = node
      }
    },
    [pickerInputRef]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        onReturnToPrompt()
      }
    },
    [onReturnToPrompt]
  )

  const onSelect = useCallback(
    (e: SyntheticEvent<HTMLTextAreaElement>) => {
      syncHighlightFromTextarea(e.currentTarget)
    },
    [syncHighlightFromTextarea]
  )

  const onScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }, [])

  return (
    <div className="bmxt-translate-editor-input-wrap">
      <div ref={mirrorRef} className="bmxt-translate-editor-mirror" aria-hidden>
        {mirrorSegments.map((segment) => {
          if (segment.kind === "plain") {
            return <span key={`plain-${segment.start}`}>{segment.text}</span>
          }
          const highlighted = highlightedIndices.has(segment.index)
          return (
            <span
              key={`sentence-${segment.start}`}
              className={highlighted ? "bmxt-translate-sentence-highlight" : undefined}>
              {segment.text}
            </span>
          )
        })}
      </div>
      <textarea
        ref={assignTextareaRef}
        className="bmxt-translate-editor-input"
        value={text}
        spellCheck={false}
        aria-label="Translate editor"
        onChange={(e) => onTextChange(e.target.value)}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onMouseUp={onSelect}
        onKeyUp={keyboardActive && !isComposing ? onSelect : undefined}
        onScroll={onScroll}
      />
    </div>
  )
}
