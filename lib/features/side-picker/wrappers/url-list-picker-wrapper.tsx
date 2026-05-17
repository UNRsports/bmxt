import { useCallback, useMemo } from "react"
import type { MutableRefObject } from "react"
import { entryDisplayLine, type PickerEntry } from "../model/picker-entry"
import { PlainTextPickerBody } from "../plain/plain-text-picker-body"

export type UrlListPickerWrapperProps = {
  headline: string
  entries: PickerEntry[]
  onReturnToPrompt: () => void
  onOpenEntry: (entry: PickerEntry) => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

/** EN: Layer ③A — flat URL/list picker (find). Tabs use `TabsUrlListPicker` on the same `PickerListShell`. */
export function UrlListPickerWrapper({
  headline,
  entries,
  onReturnToPrompt,
  onOpenEntry,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: UrlListPickerWrapperProps) {
  const lines = useMemo(() => entries.map(entryDisplayLine), [entries])

  const onConfirmLineIndex = useCallback(
    (index: number) => {
      const entry = entries[index]
      if (entry) {
        onOpenEntry(entry)
      }
    },
    [entries, onOpenEntry]
  )

  return (
    <PlainTextPickerBody
      headline={headline}
      lines={lines}
      onReturnToPrompt={onReturnToPrompt}
      onConfirmLineIndex={onConfirmLineIndex}
      enableCommandMode
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
    />
  )
}
