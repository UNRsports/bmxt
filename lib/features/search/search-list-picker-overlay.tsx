import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import {
  domListPickerHeadline,
  searchListPickerDestinationHeadline,
  searchListPickerDetailHeadline,
  searchListPickerHeadline,
  searchListPickerLoadingHeadline
} from "../setting/i18n/picker-headlines"
import { useUiCopy } from "../setting"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import {
  searchEntryOffersOpenDestination,
  searchPickerSourceLabel,
  type PickerEntry
} from "../side-picker/model/picker-entry"
import { searchPickerActiveMatchDetail } from "./search-picker-page-match"
import { resolveSearchArrowRightTarget } from "./search-arrow-right-target"
import { listSearchEntryDetailHits } from "./search-entry-detail-hits"
import { searchEntryHasOpenTab, resolveOpenTabForSearchEntry } from "./search-entry-open-tab"
import { clearSearchPickerPageHighlightsForEntry } from "./preview-search-picker-entry"
import { pageMatchesForDisplay } from "./search-picker-page-match"
import {
  SearchListPickerBody,
  type SearchListPickerView,
  type SearchPickerActionRow
} from "./search-list-picker-body"
import type { SearchListPickerState } from "./search-list-picker-input"
import type { SearchPageActiveMode } from "./page-active-setting"
import {
  executeDuplicateTabsAction,
  executeReloadTabsAction
} from "../tabs/controller/execute-actions"
import {
  listSearchPickerActions,
  SEARCH_PICKER_ACTION_MESSAGE_KEYS,
  type SearchPickerActionId
} from "./search-picker-actions"
import { verticalNavDirection } from "../side-picker/interaction/picker-vertical-nav"
import {
  buildSearchOpenDestinationRows,
  type SearchOpenDestinationRow
} from "./search-open-destination"

type DestinationReturnView = "results" | "detail"

type Props = {
  state: SearchListPickerState
  /** EN: Batched progress lines while `phase === "loading"`. */
  loadingProgressLines?: readonly string[]
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  /** EN: Cancel background page scan while `phase === "loading"`. */
  onCancelInFlightScan?: () => void
  onOpenEntry: (
    entry: PickerEntry,
    matchIndex: number,
    destination?: SearchOpenDestinationRow
  ) => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  pageActiveMode?: SearchPageActiveMode
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
  onCancelInFlightScan,
  loadingProgressLines = [],
  state,
  onOpenEntry,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  pageActiveMode = "auto"
}: Props) {
  const uiCopy = useUiCopy()
  const { phase, entries, emptyResultLines, pattern = "" } = state
  const loading = phase === "loading"
  const progressLines = loading ? loadingProgressLines : state.progressLines
  const [pickerView, setPickerView] = useState<SearchListPickerView>("results")
  const [detailEntryIndex, setDetailEntryIndex] = useState(0)
  const [destinationEntryIndex, setDestinationEntryIndex] = useState(0)
  const [destinationReturnView, setDestinationReturnView] =
    useState<DestinationReturnView>("results")
  const [resultsHi, setResultsHi] = useState(0)
  const [matchHi, setMatchHi] = useState(0)
  const [destinationEntry, setDestinationEntry] = useState<PickerEntry | undefined>(undefined)
  const [destinationMatchIndex, setDestinationMatchIndex] = useState(0)
  const [destinationRows, setDestinationRows] = useState<SearchOpenDestinationRow[]>([])
  const [actionHi, setActionHi] = useState(0)
  const actionHiRef = useRef(actionHi)
  actionHiRef.current = actionHi
  const subviewHiRef = useRef(0)
  const arrowRightBusyRef = useRef(false)
  const matchHiRef = useRef(matchHi)
  matchHiRef.current = matchHi
  const pickerViewRef = useRef(pickerView)
  pickerViewRef.current = pickerView
  const resultsHiRef = useRef(resultsHi)
  resultsHiRef.current = resultsHi
  const detailEntryIndexRef = useRef(detailEntryIndex)
  detailEntryIndexRef.current = detailEntryIndex
  const destinationReturnViewRef = useRef(destinationReturnView)
  destinationReturnViewRef.current = destinationReturnView
  const destinationEntryRef = useRef(destinationEntry)
  destinationEntryRef.current = destinationEntry
  const destinationMatchIndexRef = useRef(destinationMatchIndex)
  destinationMatchIndexRef.current = destinationMatchIndex
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const patternRef = useRef(pattern)
  patternRef.current = pattern

  useLayoutEffect(() => {
    setPickerView("results")
    setDetailEntryIndex(0)
    setDestinationEntryIndex(0)
    setDestinationReturnView("results")
    setResultsHi(0)
    setMatchHi(0)
    setDestinationEntry(undefined)
    setDestinationRows([])
    setActionHi(0)
  }, [entries, phase])

  const onHiChange = useCallback((nextHi: number) => {
    setResultsHi(nextHi)
    setMatchHi(0)
  }, [])

  const detailEntry = pickerView === "detail" ? entries[detailEntryIndex] : undefined
  const actionEntry = pickerView === "actions" ? entries[resultsHi] : undefined
  const detailHits = useMemo(() => {
    if (!detailEntry) {
      return []
    }
    return listSearchEntryDetailHits(detailEntry, pattern)
  }, [detailEntry, pattern])

  useEffect(() => {
    if (pickerView !== "detail" || !detailEntry) {
      return
    }
    return () => {
      void clearSearchPickerPageHighlightsForEntry(detailEntry)
    }
  }, [detailEntry, pickerView])

  const resultsListKey = useMemo(() => {
    if (entries.length === 0) {
      return `empty-${phase}`
    }
    const first = entries[0]?.id ?? ""
    const last = entries[entries.length - 1]?.id ?? ""
    return `${phase}:${entries.length}:${first}:${last}`
  }, [entries, phase])

  const statusLines = useMemo((): string[] => {
    if (loading) {
      return progressLines.length > 0 ? [...progressLines] : ["search — starting…"]
    }
    if (entries.length > 0) {
      return []
    }
    if (emptyResultLines && emptyResultLines.length > 0) {
      return emptyResultLines
    }
    return ["(no matches)"]
  }, [loading, progressLines, entries.length, emptyResultLines])

  const enterDestinationForEntry = useCallback(
    async (
      entry: PickerEntry,
      matchIndex: number,
      resultsIndex: number,
      returnView: DestinationReturnView
    ) => {
      if (returnView === "detail") {
        void clearSearchPickerPageHighlightsForEntry(entry)
      }
      const rows = await buildSearchOpenDestinationRows(uiCopy.locale)
      setDestinationEntryIndex(resultsIndex)
      setDestinationReturnView(returnView)
      setDestinationEntry(entry)
      setDestinationMatchIndex(matchIndex)
      setDestinationRows(rows)
      setPickerView("destination")
    },
    [uiCopy.locale]
  )

  const actionIds = useMemo((): SearchPickerActionId[] => {
    if (!actionEntry) {
      return []
    }
    const needle = pattern.trim()
    const hits = listSearchEntryDetailHits(actionEntry, needle)
    return listSearchPickerActions({
      tabOpen: true,
      hasDetailHits: hits.length > 0,
      hlSearchPattern: ""
    })
  }, [actionEntry, pattern])

  const actionRows = useMemo((): SearchPickerActionRow[] => {
    return actionIds.map((id) => ({
      id,
      label: uiCopy.t(SEARCH_PICKER_ACTION_MESSAGE_KEYS[id])
    }))
  }, [actionIds, uiCopy])

  const exitActionView = useCallback(() => {
    setPickerView("results")
    setActionHi(0)
  }, [])

  const enterActionView = useCallback(async (resultsIndex: number) => {
    const entry = entriesRef.current[resultsIndex]
    if (!entry) {
      return false
    }
    const tabOpen = await searchEntryHasOpenTab(entry)
    if (!tabOpen) {
      return false
    }
    const hits = listSearchEntryDetailHits(entry, patternRef.current)
    const ids = listSearchPickerActions({
      tabOpen: true,
      hasDetailHits: hits.length > 0,
      hlSearchPattern: ""
    })
    if (ids.length === 0) {
      return false
    }
    setActionHi(0)
    setPickerView("actions")
    return true
  }, [])

  const commitSearchAction = useCallback(
    async (actionId: SearchPickerActionId) => {
      const resultsIndex = resultsHiRef.current
      const entry = entriesRef.current[resultsIndex]
      exitActionView()
      if (!entry) {
        return
      }
      if (actionId === "detail") {
        setDetailEntryIndex(resultsIndex)
        setPickerView("detail")
        return
      }
      if (actionId === "nohlsearch") {
        return
      }
      const resolved = await resolveOpenTabForSearchEntry(entry)
      if (!resolved) {
        return
      }
      if (actionId === "reload") {
        try {
          await executeReloadTabsAction([resolved.tabId])
        } catch {
          /* ignore */
        }
        return
      }
      if (actionId === "duplicate") {
        try {
          await executeDuplicateTabsAction([resolved.tabId])
        } catch {
          /* ignore */
        }
      }
    },
    [exitActionView]
  )

  const handleArrowRight = useCallback(
    async (fromDetailView: boolean) => {
      if (arrowRightBusyRef.current) {
        return
      }
      arrowRightBusyRef.current = true
      try {
        const resultsIndex = fromDetailView
          ? detailEntryIndexRef.current
          : resultsHiRef.current
        const entry = entriesRef.current[resultsIndex]
        if (!entry) {
          return
        }

        const needle = patternRef.current
        const tabOpen = await searchEntryHasOpenTab(entry)
        if (!fromDetailView && tabOpen) {
          const opened = await enterActionView(resultsIndex)
          if (opened) {
            return
          }
        }
        const hits = listSearchEntryDetailHits(entry, needle)
        const target = resolveSearchArrowRightTarget({
          tabOpen,
          offersDestination: searchEntryOffersOpenDestination(entry),
          hasDetailHits: hits.length > 0,
          fromDetailView
        })

        if (target === "destination") {
          const hit = hits[subviewHiRef.current]
          const matchIndex = fromDetailView
            ? (hit?.pageMatchIndex ?? matchHiRef.current)
            : matchHiRef.current
          await enterDestinationForEntry(
            entry,
            matchIndex,
            resultsIndex,
            fromDetailView ? "detail" : "results"
          )
          return
        }

        if (target === "detail") {
          setDetailEntryIndex(resultsIndex)
          setPickerView("detail")
          return
        }
      } finally {
        arrowRightBusyRef.current = false
      }
    },
    [enterActionView, enterDestinationForEntry]
  )

  const headline = useMemo(() => {
    const locale = uiCopy.locale
    if (loading) {
      return searchListPickerLoadingHeadline(locale)
    }
    if (pickerView === "destination" && destinationEntry) {
      const title = destinationEntry.title.trim() || destinationEntry.url
      const clipped = title.length > 72 ? `${title.slice(0, 71)}…` : title
      return `${searchListPickerDestinationHeadline(locale)} · ${clipped}`
    }
    if (pickerView === "actions" && actionEntry) {
      const title = actionEntry.title.trim() || actionEntry.url
      const clipped = title.length > 72 ? `${title.slice(0, 71)}…` : title
      return `${uiCopy.t("search.picker.headline.actions")} · ${clipped}`
    }
    if (pickerView === "detail" && detailEntry) {
      const title = detailEntry.title.trim() || detailEntry.url
      const clipped = title.length > 72 ? `${title.slice(0, 71)}…` : title
      return `${searchListPickerDetailHeadline(locale)} · ${clipped}`
    }
    const entry = entries[resultsHi]
    const detail =
      entry && pattern.trim() !== ""
        ? searchPickerActiveMatchDetail(entry, matchHi)
        : ""
    if (!detail) {
      return searchListPickerHeadline(locale)
    }
    const clipped = detail.length > 88 ? `${detail.slice(0, 87)}…` : detail
    return `${searchListPickerHeadline(locale)} · ${clipped}`
  }, [
    loading,
    entries,
    resultsHi,
    matchHi,
    pickerView,
    detailEntry,
    destinationEntry,
    actionEntry,
    uiCopy,
    pattern
  ])

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

  const onConfirmDestination = useCallback(
    (index: number) => {
      const entry = destinationEntryRef.current
      const dest = destinationRows[index]
      if (!entry || !dest) {
        return
      }
      onOpenEntry(entry, destinationMatchIndexRef.current, dest)
      setPickerView("results")
      setDestinationReturnView("results")
      setDestinationEntry(undefined)
      setDestinationRows([])
    },
    [destinationRows, onOpenEntry]
  )

  const exitDetailView = useCallback(() => {
    const entry = entries[detailEntryIndex]
    if (entry) {
      void clearSearchPickerPageHighlightsForEntry(entry)
    }
    setResultsHi(detailEntryIndex)
    setPickerView("results")
  }, [detailEntryIndex, entries])

  const exitDestinationView = useCallback(() => {
    setResultsHi(destinationEntryIndex)
    if (destinationReturnViewRef.current === "detail") {
      setPickerView("detail")
    } else {
      setPickerView("results")
    }
    setDestinationReturnView("results")
    setDestinationEntry(undefined)
    setDestinationRows([])
  }, [destinationEntryIndex])

  const extensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      onEsc: () => {
        if (pickerViewRef.current === "actions") {
          exitActionView()
          return true
        }
        if (pickerViewRef.current === "destination") {
          exitDestinationView()
          return true
        }
        if (pickerViewRef.current === "detail") {
          exitDetailView()
          return true
        }
        return false
      },
      customVerticalNav: (e: KeyboardEvent) => {
        if (pickerViewRef.current !== "actions") {
          return false
        }
        const navDir = verticalNavDirection(e)
        if (navDir === null || actionRows.length === 0) {
          return false
        }
        pickerStopEvent(e)
        setActionHi((current) =>
          navDir === "down"
            ? Math.min(current + 1, actionRows.length - 1)
            : Math.max(current - 1, 0)
        )
        return true
      },
      onNormalEnter: (e: KeyboardEvent) => {
        if (pickerViewRef.current !== "actions") {
          return false
        }
        const action = actionRows[actionHiRef.current]
        if (!action) {
          return false
        }
        pickerStopEvent(e)
        void commitSearchAction(action.id as SearchPickerActionId)
        return true
      },
      onCaptureBefore: (e: KeyboardEvent) => {
        if (loading) {
          if (
            e.ctrlKey &&
            !e.metaKey &&
            !e.altKey &&
            (e.key === "c" || e.key === "C") &&
            onCancelInFlightScan
          ) {
            onCancelInFlightScan()
            pickerStopEvent(e)
            return true
          }
          if (
            (e.key === "ArrowLeft" || e.code === "ArrowLeft") &&
            pickerViewRef.current === "results" &&
            onExitToDetailBar
          ) {
            onExitToDetailBar()
            pickerStopEvent(e)
            return true
          }
          return false
        }

        if (!isHorizontalNavKey(e)) {
          if (
            pickerViewRef.current === "detail" ||
            pickerViewRef.current === "destination" ||
            pickerViewRef.current === "actions"
          ) {
            return false
          }
          if (patternRef.current.trim() === "") {
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
            pickerStopEvent(e)
            void handleArrowRight(false)
            return true
          }
          if (pickerViewRef.current === "detail") {
            pickerStopEvent(e)
            void handleArrowRight(true)
            return true
          }
          return false
        }

        if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
          if (pickerViewRef.current === "actions") {
            pickerStopEvent(e)
            exitActionView()
            return true
          }
          if (pickerViewRef.current === "destination") {
            exitDestinationView()
            pickerStopEvent(e)
            return true
          }
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
  }, [
    actionRows,
    commitSearchAction,
    entries,
    exitActionView,
    exitDestinationView,
    exitDetailView,
    handleArrowRight,
    loading,
    onCancelInFlightScan,
    onExitToDetailBar
  ])

  return (
    <SearchListPickerBody
      key={resultsListKey}
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
      destinationRows={destinationRows}
      destinationFromDetail={destinationReturnView === "detail"}
      onReturnToPrompt={onReturnToPrompt}
      onConfirmLineIndex={onConfirmLineIndex}
      onConfirmDetailHit={onConfirmDetailHit}
      onConfirmDestination={onConfirmDestination}
      enableCommandMode={!loading && entries.length > 0}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      extensions={extensions}
      onHiChange={onHiChange}
      subviewHiRef={subviewHiRef}
      pageActiveMode={pageActiveMode}
      actionRows={actionRows}
      actionHi={actionHi}
    />
  )
}
