import type { MutableRefObject } from "react"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import { FIND_LIST_PICKER_HEADLINE } from "../side-picker/interaction/picker-headlines"
import { UrlListPickerWrapper } from "../side-picker/wrappers/url-list-picker-wrapper"

type Props = {
  entries: PickerEntry[]
  onReturnToPrompt: () => void
  onOpenEntry: (entry: PickerEntry) => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function FindListPickerOverlay({
  onReturnToPrompt,
  entries,
  onOpenEntry,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: Props) {
  return (
    <UrlListPickerWrapper
      headline={FIND_LIST_PICKER_HEADLINE}
      entries={entries}
      onReturnToPrompt={onReturnToPrompt}
      onOpenEntry={onOpenEntry}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
