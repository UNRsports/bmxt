import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject
} from "react"
import { useSentenceTranslate } from "./use-sentence-translate"
import { setsEqual } from "./sentence-highlight"
import { listBufferLines, lineSelectionRange } from "./translation-segments"
import { TranslateSourceInput } from "./translate-source-input"
import { TranslateHighlightPanel } from "./translation-strip"

export const TRANSLATE_EDITOR_HEADLINE =
  "translate — editor · Esc → prompt · translate -off to close · 入力停止500msで 訳/再訳"

export type TranslateEditorBodyProps = {
  text: string
  onTextChange: (text: string) => void
  onReturnToPrompt: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function TranslateEditorBody({
  text,
  onTextChange,
  onReturnToPrompt,
  keyboardActive = false,
  pickerInputRef
}: TranslateEditorBodyProps) {
  const [isComposing, setIsComposing] = useState(false)
  const [highlightedLineIndices, setHighlightedLineIndices] = useState<ReadonlySet<number>>(
    () => new Set()
  )

  const { blocks, busy, statusNote } = useSentenceTranslate({
    active: true,
    buffer: text,
    isComposing: keyboardActive && isComposing
  })

  const lines = useMemo(() => listBufferLines(text), [text])

  const onHighlightedLineIndicesChange = useCallback((next: ReadonlySet<number>) => {
    setHighlightedLineIndices((prev) => (setsEqual(prev, next) ? prev : next))
  }, [])

  const onLineSelect = useCallback(
    (lineIndex: number) => {
      const line = lines.find((entry) => entry.index === lineIndex)
      const textarea = pickerInputRef?.current
      if (!line || !textarea) {
        return
      }
      const { start, end } = lineSelectionRange(line, text)
      textarea.focus()
      textarea.setSelectionRange(start, end)
    },
    [lines, pickerInputRef, text]
  )

  useEffect(() => {
    if (keyboardActive) {
      pickerInputRef?.current?.focus()
    }
  }, [keyboardActive, pickerInputRef])

  useEffect(() => {
    setHighlightedLineIndices((prev) => {
      if (prev.size === 0) {
        return prev
      }
      const maxIndex = lines.length - 1
      const next = new Set([...prev].filter((index) => index >= 0 && index <= maxIndex))
      return next.size === prev.size ? prev : next
    })
  }, [lines.length])

  return (
    <div className="bmxt-translate-editor bmxt-tab-picker">
      <div className="bmxt-tab-picker-head">{TRANSLATE_EDITOR_HEADLINE}</div>
      {statusNote ? (
        <div className="bmxt-translate-editor-status" role="status">
          {statusNote}
        </div>
      ) : null}
      <div className="bmxt-translate-editor-panels">
        <section className="bmxt-translate-editor-panel">
          <div className="bmxt-translate-editor-panel-heading">原文</div>
          <div className="bmxt-translate-editor-panel-body">
            <TranslateSourceInput
              text={text}
              onTextChange={onTextChange}
              onReturnToPrompt={onReturnToPrompt}
              highlightedLineIndices={highlightedLineIndices}
              onHighlightedLineIndicesChange={onHighlightedLineIndicesChange}
              pickerInputRef={pickerInputRef}
              keyboardActive={keyboardActive}
              isComposing={isComposing}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
            />
          </div>
        </section>
        <TranslateHighlightPanel
          label="訳"
          buffer={text}
          blocks={blocks}
          field="forward"
          busy={busy}
          highlightedLineIndices={highlightedLineIndices}
          onHighlightedLineIndicesChange={onHighlightedLineIndicesChange}
          onLineSelect={onLineSelect}
          panelLayout
        />
        <TranslateHighlightPanel
          label="再訳"
          buffer={text}
          blocks={blocks}
          field="back"
          busy={busy}
          highlightedLineIndices={highlightedLineIndices}
          onHighlightedLineIndicesChange={onHighlightedLineIndicesChange}
          onLineSelect={onLineSelect}
          panelLayout
        />
      </div>
    </div>
  )
}
