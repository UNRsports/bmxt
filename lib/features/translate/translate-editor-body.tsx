import {
  useCallback,
  useEffect,
  useState,
  type MutableRefObject
} from "react"
import { useSentenceTranslate } from "./use-sentence-translate"
import { setsEqual } from "./sentence-highlight"
import { TranslateSourceInput } from "./translate-source-input"
import { TranslationStrip } from "./translation-strip"

export const TRANSLATE_EDITOR_HEADLINE =
  "translate — editor · Esc → prompt · translate -off to close · 句点で 訳/最訳"

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
  const [highlightedIndices, setHighlightedIndices] = useState<ReadonlySet<number>>(
    () => new Set()
  )

  const { blocks, busy, statusNote } = useSentenceTranslate({
    active: true,
    buffer: text,
    isComposing: keyboardActive && isComposing
  })

  const onHighlightedIndicesChange = useCallback((next: ReadonlySet<number>) => {
    setHighlightedIndices((prev) => (setsEqual(prev, next) ? prev : next))
  }, [])

  useEffect(() => {
    if (keyboardActive) {
      pickerInputRef?.current?.focus()
    }
  }, [keyboardActive, pickerInputRef])

  useEffect(() => {
    setHighlightedIndices((prev) => {
      if (prev.size === 0) {
        return prev
      }
      const maxIndex = blocks.length - 1
      const next = new Set([...prev].filter((index) => index >= 0 && index <= maxIndex))
      return next.size === prev.size ? prev : next
    })
  }, [blocks.length])

  return (
    <div className="bmxt-translate-editor bmxt-tab-picker">
      <div className="bmxt-tab-picker-head">{TRANSLATE_EDITOR_HEADLINE}</div>
      <TranslateSourceInput
        text={text}
        onTextChange={onTextChange}
        onReturnToPrompt={onReturnToPrompt}
        highlightedIndices={highlightedIndices}
        onHighlightedIndicesChange={onHighlightedIndicesChange}
        pickerInputRef={pickerInputRef}
        keyboardActive={keyboardActive}
        isComposing={isComposing}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
      />
      <TranslationStrip
        blocks={blocks}
        busy={busy}
        statusNote={statusNote}
        alwaysVisible
        sentenceHighlight={{
          highlightedIndices,
          onHighlightedIndicesChange
        }}
      />
    </div>
  )
}
