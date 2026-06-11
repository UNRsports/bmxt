import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import {
  SEARCH_LIST_PICKER_DETAIL_HEADLINE,
  SEARCH_LIST_PICKER_HEADLINE,
  SEARCH_LIST_PICKER_LOADING_HEADLINE
} from "../side-picker/interaction/picker-headlines"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import {
  searchPickerMatchDetail,
  type PickerEntry
} from "../side-picker/model/picker-entry"
import { listSearchEntryDetailHits } from "./search-entry-detail-hits"
import { pageMatchesForDisplay } from "./search-picker-page-match"
import {
  SearchListPickerBody,
  type SearchListPickerView
} from "./search-list-picker-body"
import type { SearchListPickerState } from "./search-list-picker-input"

type Props = {
  state: SearchListPickerState
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  onOpenEntry: (entry: PickerEntry, matchIndex: number) => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

function isHorizontalNavKey(e: KeyboardEvent): boolean {
  return (
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    (e.key === "ArrowLeft" ||
      e.code === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.code === "ArrowRight")
  )
}

export function SearchListPickerOverlay({
  onReturnToPrompt,
  onExitToDetailBar,
  state,
  onOpenEntry,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: Props) {
  const { phase, progressLines, entries, emptyResultLines, pattern = "" } = state
  const loading = phase === "loading"
  const [pickerView, setPickerView] = useState<SearchListPickerView>("results")
  const [detailEntryIndex, setDetailEntryIndex] = useState(0)
  const [resultsHi, setResultsHi] = useState(0)
  const [matchHi, setMatchHi] = useState(0)
  const matchHiRef = useRef(matchHi)
  matchHiRef.current = matchHi
  const pickerViewRef = useRef(pickerView)
  pickerViewRef.current = pickerView
  const resultsHiRef = useRef(resultsHi)
  resultsHiRef.current = resultsHi

  useEffect(() => {
    setPickerView("results")
    setDetailEntryIndex(0)
    setResultsHi(0)
  }, [entries, phase])

  const onHiChange = useCallback((nextHi: number) => {
    setResultsHi(nextHi)
    setMatchHi(0)
  }, [])

  const detailEntry = pickerView === "detail" ? entries[detailEntryIndex] : undefined
  const detailHits = useMemo(() => {
    if (!detailEntry) {
      return []
    }
    return listSearchEntryDetailHits(detailEntry, pattern)
  }, [detailEntry, pattern])

  const statusLines = useMemo(() => {
    if (loading) {
      return progressLines.length > 0 ? progressLines : ["search — starting…"]
    }
    if (entries.length > 0) {
      return []
    }
    if (emptyResultLines && emptyResultLines.length > 0) {
      return emptyResultLines
    }
    return ["(no matches)"]
  }, [loading, progressLines, entries.length, emptyResultLines])

  const headline = useMemo(() => {
    if (loading) {
      return SEARCH_LIST_PICKER_LOADING_HEADLINE
    }
    if (pickerView === "detail" && detailEntry) {
      const title = detailEntry.title.trim() || detailEntry.url
      const clipped = title.length > 72 ? `${title.slice(0, 71)}…` : title
      return `${SEARCH_LIST_PICKER_DETAIL_HEADLINE} · ${clipped}`
    }
    const entry = entries[resultsHi]
    const detail = entry ? searchPickerMatchDetail(entry, matchHi) : ""
    if (!detail) {
      return SEARCH_LIST_PICKER_HEADLINE
    }
    const clipped = detail.length > 88 ? `${detail.slice(0, 87)}…` : detail
    return `${SEARCH_LIST_PICKER_HEADLINE} · ${clipped}`
  }, [loading, entries, resultsHi, matchHi, pickerView, detailEntry])

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

  const onConfirmDetailHit = useCallback(
    (index: number) => {
      if (loading || !detailEntry) {
        return
      }
      const hit = detailHits[index]
      if (!hit) {
        return
      }
      const matchIndex = hit.pageMatchIndex ?? 0
      onOpenEntry(detailEntry, matchIndex)
    },
    [detailEntry, detailHits, loading, onOpenEntry]
  )

  const enterDetailForHi = useCallback(
    (index: number) => {
      const entry = entries[index]
      if (!entry) {
        return false
      }
      const hits = listSearchEntryDetailHits(entry, pattern)
      if (hits.length === 0) {
        return false
      }
      setDetailEntryIndex(index)
      setPickerView("detail")
      return true
    },
    [entries, pattern]
  )

  const exitDetailView = useCallback(() => {
    setResultsHi(detailEntryIndex)
    setPickerView("results")
  }, [detailEntryIndex])

  const extensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      onEsc: () => {
        if (pickerViewRef.current === "detail") {
          exitDetailView()
          return true
        }
        return false
      },
      onCaptureBefore: (e: KeyboardEvent) => {
        const ev = e as KeyboardEvent & { isComposing?: boolean }
        if (
          e.key === "Enter" &&
          !e.shiftKey &&
          !ev.isComposing &&
          !loading &&
          pickerViewRef.current === "results"
        ) {
          if (enterDetailForHi(resultsHiRef.current)) {
            pickerStopEvent(e)
            return true
          }
        }

        if (loading || !isHorizontalNavKey(e)) {
          if (loading) {
            return false
          }
          if (pickerViewRef.current === "detail") {
            return false
          }
          const entry = entries[resultsHiRef.current]
          const n = pageMatchesForDisplay(entry?.pageMatches).length
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

        if (e.key === "ArrowRight" || e.code === "ArrowRight") {
          if (pickerViewRef.current === "results") {
            if (enterDetailForHi(resultsHiRef.current)) {
              pickerStopEvent(e)
              return true
            }
          }
          return false
        }

        if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
          if (pickerViewRef.current === "detail") {
            exitDetailView()
            pickerStopEvent(e)
            return true
          }
          if (onExitToDetailBar) {
            onExitToDetailBar()
            pickerStopEvent(e)
            return true
          }
          return false
        }

        return false
      }
    }
  }, [enterDetailForHi, entries, exitDetailView, loading, onExitToDetailBar])

  return (
    <SearchListPickerBody
      headline={headline}
      entries={entries}
      pattern={pattern}
      statusLines={statusLines}
      statusOnly={loading || entries.length === 0}
      matchHi={matchHi}
      pickerView={pickerView}
      detailHits={detailHits}
      detailEntry={detailEntry}
      resultsFocusHi={resultsHi}
      onReturnToPrompt={onReturnToPrompt}
      onConfirmLineIndex={onConfirmLineIndex}
      onConfirmDetailHit={onConfirmDetailHit}
      enableCommandMode={!loading && entries.length > 0}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      extensions={extensions}
      onHiChange={onHiChange}
    />
  )
}
