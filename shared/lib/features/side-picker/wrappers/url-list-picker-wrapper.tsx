import { useCallback, useMemo } from "react"
import type { MutableRefObject } from "react"
import { useUiSettings } from "../../setting/use-ui-settings"
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
  const { settings } = useUiSettings()
  const legendMode = settings.searchLegendMode
  const lines = useMemo(
    () => entries.map((entry) => entryDisplayLine(entry, legendMode)),
    [entries, legendMode]
  )

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
