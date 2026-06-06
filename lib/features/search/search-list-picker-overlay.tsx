import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import {
  SEARCH_LIST_PICKER_HEADLINE,
  SEARCH_LIST_PICKER_LOADING_HEADLINE
} from "../side-picker/interaction/picker-headlines"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import {
  searchPickerMatchDetail,
  searchPickerSummaryLine,
  type PickerEntry
} from "../side-picker/model/picker-entry"
import { PlainTextPickerBody } from "../side-picker/plain/plain-text-picker-body"
import type { SearchListPickerState } from "./search-list-picker-input"

type Props = {
  state: SearchListPickerState
  onReturnToPrompt: () => void
  onOpenEntry: (entry: PickerEntry, matchIndex: number) => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function SearchListPickerOverlay({
  onReturnToPrompt,
  state,
  onOpenEntry,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: Props) {
  const { phase, progressLines, entries, emptyResultLines } = state
  const loading = phase === "loading"
  const [hi, setHi] = useState(0)
  const [matchHi, setMatchHi] = useState(0)
  const matchHiRef = useRef(matchHi)
  matchHiRef.current = matchHi

  const onHiChange = useCallback((nextHi: number) => {
    setHi(nextHi)
    setMatchHi(0)
  }, [])

  const lines = useMemo(() => {
    if (loading) {
      return progressLines.length > 0 ? progressLines : ["search — starting…"]
    }
    if (entries.length > 0) {
      return entries.map(searchPickerSummaryLine)
    }
    if (emptyResultLines && emptyResultLines.length > 0) {
      return emptyResultLines
    }
    return ["(no matches)"]
  }, [loading, progressLines, entries, emptyResultLines])

  const headline = useMemo(() => {
    if (loading) {
      return SEARCH_LIST_PICKER_LOADING_HEADLINE
    }
    const entry = entries[hi]
    const detail = entry ? searchPickerMatchDetail(entry, matchHi) : ""
    if (!detail) {
      return SEARCH_LIST_PICKER_HEADLINE
    }
    const clipped = detail.length > 88 ? `${detail.slice(0, 87)}…` : detail
    return `${SEARCH_LIST_PICKER_HEADLINE} · ${clipped}`
  }, [loading, entries, hi, matchHi])

  const onConfirmLineIndex = useCallback(
    (index: number) => {
      if (loading) {
        return
      }
      const entry = entries[index]
      if (entry) {
        onOpenEntry(entry, matchHiRef.current)
      }
    },
    [loading, entries, onOpenEntry]
  )

  const extensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      onCaptureBefore: (e: KeyboardEvent) => {
        if (loading) {
          return false
        }
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
  }, [loading, entries, hi])

  return (
    <PlainTextPickerBody
      headline={headline}
      lines={lines}
      onReturnToPrompt={onReturnToPrompt}
      onConfirmLineIndex={onConfirmLineIndex}
      enableCommandMode={!loading && entries.length > 0}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      extensions={extensions}
      onHiChange={onHiChange}
      statusOnly={loading || entries.length === 0}
    />
  )
}
