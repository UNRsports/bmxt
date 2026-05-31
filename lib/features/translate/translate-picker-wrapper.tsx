import type { MutableRefObject } from "react"
import { TranslateEditorBody } from "./translate-editor-body"
import type { TranslationPairId } from "./translation-pair"
import type { TranslatePickerState } from "./translate-picker-state"

export type TranslatePickerWrapperProps = {
  pairId: TranslationPairId
  state: TranslatePickerState
  onTextChange: (text: string) => void
  onReturnToPrompt: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function TranslatePickerWrapper({
  pairId,
  state,
  onTextChange,
  onReturnToPrompt,
  keyboardActive,
  pickerInputRef,
  sessionId
}: TranslatePickerWrapperProps) {
  return (
    <TranslateEditorBody
      pairId={pairId}
      text={state.text}
      onTextChange={onTextChange}
      onReturnToPrompt={onReturnToPrompt}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
