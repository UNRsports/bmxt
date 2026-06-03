import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type MutableRefObject,
  type SyntheticEvent,
  type UIEvent
} from "react"
import { indicesToSet } from "./sentence-highlight"
import { lineIndicesInRange, listBufferLines, lineSelectionRange } from "./translation-segments"

type Props = {
  text: string
  onTextChange: (text: string) => void
  onReturnToPrompt: () => void
  highlightedLineIndices: ReadonlySet<number>
  onHighlightedLineIndicesChange: (indices: ReadonlySet<number>) => void
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
  highlightedLineIndices,
  onHighlightedLineIndicesChange,
  pickerInputRef,
  keyboardActive = false,
  isComposing,
  onCompositionStart,
  onCompositionEnd
}: Props) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const lines = useMemo(() => listBufferLines(text), [text])

  const syncHighlightFromTextarea = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const indices = lineIndicesInRange(
        lines,
        textarea.selectionStart,
        textarea.selectionEnd
      )
      onHighlightedLineIndicesChange(indicesToSet(indices))
    },
    [lines, onHighlightedLineIndicesChange]
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
    const mirror = mirrorRef.current
    if (mirror) {
      mirror.scrollTop = e.currentTarget.scrollTop
    }
  }, [])

  useLayoutEffect(() => {
    const textarea = pickerInputRef?.current
    const mirror = mirrorRef.current
    if (!textarea || !mirror) {
      return
    }
    mirror.style.minHeight = `${textarea.scrollHeight}px`
  }, [text, lines, pickerInputRef])

  useEffect(() => {
    if (highlightedLineIndices.size === 0) {
      return
    }
    const firstLineIndex = Math.min(...highlightedLineIndices)
    const el = mirrorRef.current?.querySelector(`[data-line-index="${firstLineIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightedLineIndices])

  return (
    <div className="bmxt-translate-editor-input-wrap">
      <div ref={mirrorRef} className="bmxt-translate-editor-mirror" aria-hidden>
        {lines.map((line) => {
          const highlighted = highlightedLineIndices.has(line.index)
          return (
            <span
              key={`line-${line.start}`}
              data-line-index={line.index}
              className={
                highlighted
                  ? "bmxt-translate-line bmxt-translate-sentence-highlight"
                  : "bmxt-translate-line"
              }>
              {text.slice(line.start, line.end)}
            </span>
          )
        })}
      </div>
      <textarea
        ref={assignTextareaRef}
        className="bmxt-translate-editor-input"
        value={text}
        spellCheck={false}
        wrap="soft"
        aria-label="Translate editor source"
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
