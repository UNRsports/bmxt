import {
  useCallback,
  useEffect,
  useState,
  type KeyboardEvent,
  type MutableRefObject
} from "react"
import { useSentenceTranslate } from "./use-sentence-translate"
import { TranslationStrip } from "./translation-strip"

export const TRANSLATE_EDITOR_HEADLINE =
  "translate — editor · Esc → prompt · translate -off to close · 句点で ja/EN/再訳"

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

  const { blocks, busy, statusNote } = useSentenceTranslate({
    active: keyboardActive,
    buffer: text,
    isComposing
  })

  useEffect(() => {
    if (!keyboardActive) {
      return
    }
    pickerInputRef?.current?.focus()
  }, [keyboardActive, pickerInputRef])

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

  return (
    <div className="bmxt-translate-editor bmxt-tab-picker">
      <div className="bmxt-tab-picker-head">{TRANSLATE_EDITOR_HEADLINE}</div>
      <textarea
        ref={pickerInputRef}
        className="bmxt-translate-editor-input"
        value={text}
        spellCheck={false}
        aria-label="Translate editor"
        onChange={(e) => onTextChange(e.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={onKeyDown}
      />
      <TranslationStrip blocks={blocks} busy={busy} statusNote={statusNote} />
    </div>
  )
}
