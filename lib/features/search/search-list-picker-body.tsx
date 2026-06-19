import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction
} from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../bmxt-window/csp-dynamic-stylesheet"
import { useUiCopy } from "../setting"
import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { usePlainPickerKeyboard } from "../side-picker/hooks/use-plain-picker-keyboard"
import { scrollPickerListToHiAfterLayout, scrollPickerListToHiAnimated, scrollSearchPickerHighlightIntoViewAfterLayout } from "../side-picker/interaction/picker-list-scroll"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { urlListCommandListingHint } from "../side-picker/interaction/url-list-commands"
import {
  computePlainPickerWindow,
  PLAIN_PICKER_VIRTUALIZE_MIN,
  scrollTopForPlainPickerIndex
} from "../side-picker/plain/plain-text-picker-virtual"
import { searchPickerSourceLabel, type PickerEntry } from "../side-picker/model/picker-entry"
import { useSearchPickerAltPreviewKit } from "./use-search-picker-alt-preview-kit"
import { useSearchPickerResultsOpenTabNav } from "./use-search-picker-results-open-tab-nav"
import { excerptAroundNeedleWithHighlight, SEARCH_PICKER_TEXT_CONTEXT_CHARS } from "./search-picker-excerpt"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import { SearchPickerHighlight } from "./search-picker-highlight"
import { SearchPickerTabFavicon } from "./search-picker-tab-favicon"
import { SearchPickerBreadcrumb } from "./search-picker-breadcrumb"
import { pickPageMatchForDisplay } from "./search-picker-page-match"
import { SearchOpenDestinationPickerRow } from "./search-open-destination-picker-row"
import type { SearchOpenDestinationRow } from "./search-open-destination"
import { resolveSearchHighlightAppearance, useUiSettings } from "../setting"
import type { SearchPageActiveMode } from "./page-active-setting"
import type { SearchPickerListScrollHint } from "./use-search-picker-alt-preview-kit"

const ROW_ID_PREFIX = "bmxt-search-row"

/** EN: Estimated row height until the hidden probe row is measured. */
const SEARCH_PICKER_ROW_HEIGHT_FALLBACK = 64

export type SearchListPickerView = "results" | "detail" | "destination"

export type SearchListPickerBodyProps = {
  headline: string
  entries: PickerEntry[]
  /** EN: Pattern from `search -list …` — highlighted in title / text rows. */
  pattern: string
  /** EN: Status lines while loading or when there are no openable rows. */
  statusLines?: string[]
  statusOnly?: boolean
  matchHi?: number
  pickerView?: SearchListPickerView
  detailHits?: SearchEntryDetailHit[]
  detailEntry?: PickerEntry
  /** EN: Row index to restore when returning from detail view to the results list. */
  resultsFocusHi?: number
  onReturnToPrompt: () => void
  onConfirmLineIndex?: (index: number) => void
  onConfirmDetailHit?: (index: number) => void
  destinationRows?: SearchOpenDestinationRow[]
  onConfirmDestination?: (index: number) => void
  enableCommandMode?: boolean
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  extensions?: PlainPickerKeyboardExtensions
  onHiChange?: (hi: number) => void
  /** EN: Updated while detail or destination subview is active (for overlay keyboard routing). */
  subviewHiRef?: MutableRefObject<number>
  /** EN: Breadcrumb shows Results → Detail → Open target when destination opened from detail. */
  destinationFromDetail?: boolean
  pageActiveMode?: SearchPageActiveMode
}

function SearchListStatusRow({
  index,
  line,
  hi
}: {
  index: number
  line: string
  hi: number
}): ReactNode {
  const hiRow = index === hi
  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="listitem"
      className={`bmxt-tab-picker-row bmxt-tab-picker-row--tab bmxt-tab-picker-row--status${
        hiRow ? " bmxt-tab-picker-row--hi" : ""
      }`}>
      <div className="bmxt-tab-picker-tab-title">
        <span className="bmxt-plain-picker-row-text">{line}</span>
      </div>
    </div>
  )
}

function SearchDetailPickerRow({
  index,
  hit,
  hi,
  highlightNeedle,
  entry
}: {
  index: number
  hit: SearchEntryDetailHit
  hi: number
  highlightNeedle: string
  entry: PickerEntry
}): ReactNode {
  const hiRow = index === hi
  const fieldLabel = `${hit.field}:`
  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={`bmxt-search-picker-row${hiRow ? " bmxt-search-picker-row--hi" : ""}`}>
      {index === 0 ? (
        <div className="bmxt-search-picker-scope">{searchPickerSourceLabel(entry)}</div>
      ) : null}
      <div className="bmxt-search-picker-field">
        <div className="bmxt-search-picker-field-label">{fieldLabel}</div>
        <div className="bmxt-search-picker-text">
          <SearchPickerHighlight text={hit.displayText} needle={highlightNeedle} />
        </div>
      </div>
    </div>
  )
}

function SearchListPickerRow({
  index,
  entry,
  hi,
  pattern,
  highlightNeedle,
  matchHi
}: {
  index: number
  entry: PickerEntry
  hi: number
  pattern: string
  highlightNeedle: string
  matchHi: number
}): ReactNode {
  const hiRow = index === hi
  const pageMatch = pickPageMatchForDisplay(entry.pageMatches, hiRow ? matchHi : 0)
  const showText = pageMatch != null && pageMatch.snippet.trim().length > 0
  const textExcerpt = pageMatch
    ? excerptAroundNeedleWithHighlight(
        pageMatch.snippet,
        pattern,
        SEARCH_PICKER_TEXT_CONTEXT_CHARS,
        pageMatch.occurrence ?? 0
      )
    : { text: "", highlightOccurrence: 0 }
  const titleNeedle = highlightNeedle.trim() !== "" ? highlightNeedle : pattern
  const textNeedle = highlightNeedle.trim() !== "" ? highlightNeedle : pattern
  const titleHighlightOccurrence = hiRow && titleNeedle.trim() !== "" ? 0 : undefined
  const textHighlightOccurrence = hiRow && textNeedle.trim() !== "" ? textExcerpt.highlightOccurrence : undefined

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={`bmxt-search-picker-row${hiRow ? " bmxt-search-picker-row--hi" : ""}`}>
      <div className="bmxt-search-picker-scope">{searchPickerSourceLabel(entry)}</div>
      <div className="bmxt-search-picker-field">
        <div className="bmxt-search-picker-field-label">title:</div>
        <div className="bmxt-search-picker-title">
          {entry.tabId != null ? (
            <SearchPickerTabFavicon tabId={entry.tabId} url={entry.url} />
          ) : null}
          <span className="bmxt-search-picker-title-text">
            <SearchPickerHighlight
              text={entry.title.trim() || entry.url}
              needle={titleNeedle}
              activeOccurrence={titleHighlightOccurrence}
            />
          </span>
        </div>
      </div>
      {showText ? (
        <div className="bmxt-search-picker-field">
          <div className="bmxt-search-picker-field-label">text:</div>
          <div className="bmxt-search-picker-text">
            <SearchPickerHighlight
              text={textExcerpt.text}
              needle={textNeedle}
              activeOccurrence={textHighlightOccurrence}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SearchListPickerBody({
  headline,
  entries,
  pattern,
  statusLines = [],
  statusOnly = false,
  matchHi = 0,
  pickerView = "results",
  detailHits = [],
  detailEntry,
  resultsFocusHi = 0,
  onReturnToPrompt,
  onConfirmLineIndex,
  onConfirmDetailHit,
  destinationRows = [],
  onConfirmDestination,
  enableCommandMode = false,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  extensions,
  onHiChange,
  subviewHiRef,
  destinationFromDetail = false,
  pageActiveMode = "auto"
}: SearchListPickerBodyProps) {
  const uiCopy = useUiCopy()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )
  const listRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [hi, setHiState] = useState(0)
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

  const inDetailView = pickerView === "detail" && detailEntry != null
  const inDestinationView = pickerView === "destination"
  const setHi = useCallback(
    (action: SetStateAction<number>) => {
      setHiState((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        if (!inDetailView && !inDestinationView) {
          onHiChange?.(next)
        }
        return next
      })
    },
    [inDestinationView, inDetailView, onHiChange]
  )
  const lineCount = statusOnly
    ? statusLines.length
    : inDestinationView
      ? destinationRows.length
      : inDetailView
        ? detailHits.length
        : entries.length
  const matchLines = useMemo(
    () =>
      statusOnly
        ? statusLines
        : inDestinationView
          ? destinationRows.map((r) => r.label)
          : inDetailView
            ? detailHits.map((h) => h.displayText)
            : entries.map((e) => e.title),
    [destinationRows, detailHits, entries, inDestinationView, inDetailView, statusLines, statusOnly]
  )
  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern
  const rowHighlightNeedle =
    searchHighlightQuery.trim() !== "" ? searchHighlightQuery : pattern

  const listResetKey = inDestinationView
    ? `destination-${destinationRows.length}`
    : inDetailView
      ? `detail-${detailEntry?.id ?? ""}-${detailHits.length}`
      : `results-${entries.length}-${entries[0]?.id ?? ""}-${entries[entries.length - 1]?.id ?? ""}`

  const useVirtual =
    !statusOnly &&
    !inDetailView &&
    !inDestinationView &&
    entries.length >= PLAIN_PICKER_VIRTUALIZE_MIN
  const effectiveRowHeight = rowHeight ?? SEARCH_PICKER_ROW_HEIGHT_FALLBACK

  const syncWindowFromScroll = useCallback(() => {
    const list = listRef.current
    if (!list || !useVirtual || entries.length === 0) {
      return
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        entries.length,
        effectiveRowHeight
      )
    )
  }, [effectiveRowHeight, entries.length, useVirtual])

  useEffect(() => {
    const startHi =
      statusOnly && statusLines.length > 0
        ? statusLines.length - 1
        : inDetailView
          ? 0
          : resultsFocusHi
    setHi(startHi)
    setSearchMode(false)
    setFilterQuery("")
    setHlSearchPattern("")
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
    if (listRef.current) {
      if (statusOnly && statusLines.length > 0) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      } else if (!statusOnly) {
        listRef.current.scrollTop = 0
      }
    }
  }, [listResetKey, statusLines, statusOnly, inDetailView, resultsFocusHi])

  useLayoutEffect(() => {
    const probe = measureRef.current
    if (!probe) {
      return
    }
    const h = probe.getBoundingClientRect().height
    if (h > 0) {
      setRowHeight(h)
    }
  }, [entries.length, useVirtual])

  useEffect(() => {
    if (lineCount === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lineCount - 1))
  }, [lineCount])

  useLayoutEffect(() => {
    if ((inDetailView || inDestinationView) && subviewHiRef) {
      subviewHiRef.current = hi
    }
  }, [hi, inDestinationView, inDetailView, subviewHiRef])

  const altPreviewEnabled =
    keyboardActive &&
    !statusOnly &&
    inDetailView &&
    detailEntry != null &&
    detailHits.length > 0

  const { settings } = useUiSettings()
  const searchHighlightColors = useMemo(
    () => resolveSearchHighlightAppearance(settings.appearance),
    [settings.appearance]
  )

  const listScrollHintRef = useRef<SearchPickerListScrollHint | null>(null)

  const resultsOpenTabNavEnabled =
    keyboardActive && !statusOnly && !inDetailView && !inDestinationView && entries.length > 0

  const {
    mergedExtensions: resultsNavExtensions,
    previewNotice: resultsPreviewNotice
  } = useSearchPickerResultsOpenTabNav({
    enabled: resultsOpenTabNavEnabled,
    isHostPaneFocused: keyboardActive,
    entries,
    pattern,
    matchHi,
    hi,
    lineCount,
    setHi,
    searchMode,
    commandMode,
    pageActiveMode,
    listScrollHintRef,
    baseExtensions: extensions
  })

  const { mergedExtensions, previewNotice: detailPreviewNotice } = useSearchPickerAltPreviewKit({
      enabled: altPreviewEnabled,
      isHostPaneFocused: keyboardActive,
      pattern,
      hi,
      lineCount,
      setHi,
      searchMode,
      commandMode,
      detailEntry,
      detailHits,
      highlightColors: searchHighlightColors,
      pageActiveMode,
      listScrollHintRef,
      baseExtensions: resultsNavExtensions
    })

  const previewNotice = detailPreviewNotice ?? resultsPreviewNotice

  const followListScrollToHi = useCallback(() => {
    const hint = listScrollHintRef.current
    listScrollHintRef.current = null
    const scrollOptions = hint?.alignStart ? { alignStart: true as const } : undefined
    const list = listRef.current

    if (list) {
      const rowInDom = list.querySelector<HTMLElement>(`#${CSS.escape(`${ROW_ID_PREFIX}-${hi}`)}`)
      if (rowInDom) {
        if (hint?.animated) {
          scrollPickerListToHiAnimated(list, ROW_ID_PREFIX, hi, scrollOptions)
        } else {
          scrollPickerListToHiAfterLayout(list, ROW_ID_PREFIX, hi, scrollOptions)
        }
        if (useVirtual) {
          setWindowRange(
            computePlainPickerWindow(
              list.scrollTop,
              list.clientHeight,
              entries.length,
              effectiveRowHeight
            )
          )
        }
        return
      }
    }

    if (useVirtual && list) {
      const targetTop = hint?.alignStart
        ? hi * effectiveRowHeight
        : scrollTopForPlainPickerIndex(
            list.scrollTop,
            list.clientHeight,
            hi,
            effectiveRowHeight
          )
      if (targetTop !== list.scrollTop) {
        if (hint?.animated) {
          list.scrollTo({ top: targetTop, behavior: "smooth" })
        } else {
          list.scrollTop = targetTop
        }
      }
      setWindowRange(
        computePlainPickerWindow(
          hint?.animated ? targetTop : list.scrollTop,
          list.clientHeight,
          entries.length,
          effectiveRowHeight
        )
      )
      return
    }

    if (hint?.animated) {
      scrollPickerListToHiAnimated(list, ROW_ID_PREFIX, hi, scrollOptions)
      return
    }
    scrollPickerListToHiAfterLayout(list, ROW_ID_PREFIX, hi, scrollOptions)
  }, [effectiveRowHeight, entries.length, hi, listScrollHintRef, useVirtual])

  useLayoutEffect(() => {
    if (lineCount === 0) {
      return
    }
    followListScrollToHi()
  }, [followListScrollToHi, hi, lineCount, pickerView])

  useLayoutEffect(() => {
    if (lineCount === 0 || statusOnly || inDetailView || inDestinationView) {
      return
    }
    scrollSearchPickerHighlightIntoViewAfterLayout(listRef.current, ROW_ID_PREFIX, hi)
  }, [hi, inDestinationView, inDetailView, lineCount, matchHi, pickerView, statusOnly])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    } else {
      inputRef.current?.blur()
    }
  }, [keyboardActive])

  const confirmLineIndex = inDestinationView
    ? onConfirmDestination
    : inDetailView
      ? onConfirmDetailHit
      : onConfirmLineIndex

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: statusOnly ? 0 : lineCount,
    keyboardActive,
    sessionId,
    enableCommandMode: statusOnly || inDetailView || inDestinationView ? false : enableCommandMode,
    onReturnToPrompt,
    onConfirmLineIndex: statusOnly ? undefined : confirmLineIndex,
    hi,
    setHi,
    searchMode,
    setSearchMode,
    filterQuery,
    setFilterQuery,
    hlSearchPattern,
    setHlSearchPattern,
    commandMode,
    setCommandMode,
    commandBuffer,
    setCommandBuffer,
    setCommandListingHint,
    matchLines,
    extensions: mergedExtensions
  })

  const activeRowId =
    lineCount > 0 && hi >= 0 && hi < lineCount ? `${ROW_ID_PREFIX}-${hi}` : undefined

  const listAriaLabel = inDestinationView
    ? "Search open targets"
    : inDetailView
      ? "Search result detail hits"
      : "Search results"

  const renderResultsRows = (start: number, end: number): ReactNode[] => {
    const slice: ReactNode[] = []
    for (let i = start; i < end; i++) {
      const entry = entries[i]
      if (!entry) {
        continue
      }
      slice.push(
        <SearchListPickerRow
          key={entry.id}
          index={i}
          entry={entry}
          hi={hi}
          pattern={pattern}
          highlightNeedle={rowHighlightNeedle}
          matchHi={matchHi}
        />
      )
    }
    return slice
  }

  const totalHeight = useVirtual ? entries.length * effectiveRowHeight : undefined
  const virtualStart = useVirtual ? windowRange.start : 0
  const virtualEnd = useVirtual ? windowRange.end : entries.length
  const virtualTrackScopeId = useId()
  const virtualWindowScopeId = useId()
  const listScopeId = useId()
  useCspDynamicStyle(
    useVirtual ? listScopeId : null,
    useVirtual ? { "--bmxt-search-picker-row-height": `${effectiveRowHeight}px` } : null
  )
  useCspDynamicStyle(
    useVirtual ? virtualTrackScopeId : null,
    useVirtual && totalHeight !== undefined ? { height: `${totalHeight}px` } : null
  )
  useCspDynamicStyle(
    useVirtual ? virtualWindowScopeId : null,
    useVirtual
      ? { transform: `translateY(${virtualStart * effectiveRowHeight}px)` }
      : null
  )

  useLayoutEffect(() => {
    if (!useVirtual || statusOnly || inDetailView || inDestinationView || entries.length === 0) {
      return
    }
    const list = listRef.current
    if (!list) {
      return
    }
    list.scrollTop = 0
    setWindowRange(
      computePlainPickerWindow(0, list.clientHeight, entries.length, effectiveRowHeight)
    )
  }, [listResetKey, effectiveRowHeight, entries.length, inDestinationView, inDetailView, statusOnly, useVirtual])

  useLayoutEffect(() => {
    if (!useVirtual) {
      return
    }
    syncWindowFromScroll()
  }, [syncWindowFromScroll, useVirtual, effectiveRowHeight, entries.length])

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-search-picker">
      {!statusOnly ? (
        <SearchPickerBreadcrumb
          view={pickerView}
          showDetailBeforeDestination={destinationFromDetail}
        />
      ) : null}
      <div className="bmxt-tab-picker-head">{headline}</div>
      {previewNotice ? (
        <div className="bmxt-tab-picker-head bmxt-search-picker-preview-notice" role="status">
          {previewNotice}
        </div>
      ) : null}
      <textarea
        ref={setInputEl}
        className="bmxt-tab-picker-filter-ime bmxt-picker-hidden-ime"
        rows={1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={
          searchMode ? "Search highlight" : commandMode ? "Command input" : "Search picker keys"
        }
        value={searchMode ? filterQuery : commandMode ? commandBuffer : ""}
        onChange={(e) => {
          if (searchMode) {
            setFilterQuery(e.target.value)
          } else if (commandMode) {
            setCommandBuffer(e.target.value)
          }
        }}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={(e) => {
          if (searchMode) {
            setFilterQuery(e.currentTarget.value)
          } else if (commandMode) {
            setCommandBuffer(e.currentTarget.value)
          }
        }}
      />
      <div
        ref={listRef}
        className={`bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable${
          useVirtual ? " bmxt-tab-picker-list--search-virtual" : ""
        }`}
        {...(useVirtual ? { [CSP_DYNAMIC_SCOPE_ATTR]: listScopeId } : {})}
        role="listbox"
        aria-label={listAriaLabel}
        aria-activedescendant={activeRowId}
        onScroll={useVirtual ? syncWindowFromScroll : undefined}>
        {useVirtual ? (
          <div
            ref={measureRef}
            className="bmxt-search-picker-row bmxt-search-picker-measure-row"
            aria-hidden>
            <div className="bmxt-search-picker-scope">[history]</div>
            <div className="bmxt-search-picker-field">
              <div className="bmxt-search-picker-field-label">title:</div>
              <div className="bmxt-search-picker-title">
                <span className="bmxt-search-picker-title-text">{"\u00a0"}</span>
              </div>
            </div>
            <div className="bmxt-search-picker-field">
              <div className="bmxt-search-picker-field-label">url:</div>
              <div className="bmxt-search-picker-text">{"\u00a0"}</div>
            </div>
          </div>
        ) : null}
        {lineCount === 0 ? (
          <div className="bmxt-tab-picker-empty">(no output)</div>
        ) : statusOnly ? (
          statusLines.map((line, i) => (
            <SearchListStatusRow key={i} index={i} line={line} hi={hi} />
          ))
        ) : inDestinationView ? (
          destinationRows.map((row, i) => (
            <SearchOpenDestinationPickerRow key={`${row.kind}-${row.windowId ?? ""}-${row.groupId ?? ""}-${i}`} index={i} row={row} hi={hi} />
          ))
        ) : inDetailView && detailEntry ? (
          detailHits.map((hit, i) => (
            <SearchDetailPickerRow
              key={`${detailEntry.id}-${i}`}
              index={i}
              hit={hit}
              hi={hi}
              highlightNeedle={rowHighlightNeedle}
              entry={detailEntry}
            />
          ))
        ) : useVirtual ? (
          <div
            className="bmxt-plain-picker-virtual-track"
            {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualTrackScopeId }}>
            <div
              className="bmxt-plain-picker-virtual-window"
              {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualWindowScopeId }}>
              {renderResultsRows(virtualStart, virtualEnd)}
            </div>
          </div>
        ) : (
          renderResultsRows(0, entries.length)
        )}
      </div>
      {searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <PickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={urlListCommandListingHint(uiCopy.locale)}
          ambiguousPlaceholder={null}
        />
      ) : null}
    </div>
  )
}
