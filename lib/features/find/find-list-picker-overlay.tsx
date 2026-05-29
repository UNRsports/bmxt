import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import { FIND_LIST_PICKER_HEADLINE } from "../side-picker/interaction/picker-headlines"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import {
  findPickerMatchDetail,
  findPickerSummaryLine,
  type PickerEntry
} from "../side-picker/model/picker-entry"
import { PlainTextPickerBody } from "../side-picker/plain/plain-text-picker-body"

type Props = {
  entries: PickerEntry[]
  onReturnToPrompt: () => void
  onOpenEntry: (entry: PickerEntry, matchIndex: number) => void
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
  const [hi, setHi] = useState(0)
  const [matchHi, setMatchHi] = useState(0)
  const matchHiRef = useRef(matchHi)
  matchHiRef.current = matchHi

  const onHiChange = useCallback((nextHi: number) => {
    setHi(nextHi)
    setMatchHi(0)
  }, [])

  const lines = useMemo(() => entries.map(findPickerSummaryLine), [entries])

  const headline = useMemo(() => {
    const entry = entries[hi]
    const detail = entry ? findPickerMatchDetail(entry, matchHi) : ""
    if (!detail) {
      return FIND_LIST_PICKER_HEADLINE
    }
    const clipped = detail.length > 88 ? `${detail.slice(0, 87)}…` : detail
    return `${FIND_LIST_PICKER_HEADLINE} · ${clipped}`
  }, [entries, hi, matchHi])

  const onConfirmLineIndex = useCallback(
    (index: number) => {
      const entry = entries[index]
      if (entry) {
        onOpenEntry(entry, matchHiRef.current)
      }
    },
    [entries, onOpenEntry]
  )

  const extensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      onCaptureBefore: (e: KeyboardEvent) => {
        const entry = entries[hi]
        const n = entry?.pageMatches?.length ?? 0
        if (n <= 1) {
          return false
        }
        const key = e.key
        if (key === "n" && !e.shiftKey) {
          setMatchHi((m) => (m + 1) % n)
          pickerStopEvent(e)
          return true
        }
        if (key === "N" || (key === "n" && e.shiftKey)) {
          setMatchHi((m) => (m - 1 + n) % n)
          pickerStopEvent(e)
          return true
        }
        return false
      }
    }
  }, [entries, hi])

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
      extensions={extensions}
      onHiChange={onHiChange}
    />
  )
}
