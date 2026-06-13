import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction
} from "react"
import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { usePlainPickerKeyboard } from "../side-picker/hooks/use-plain-picker-keyboard"
import { scrollPickerListToHiAfterLayout, scrollPickerListToHiAnimated } from "../side-picker/interaction/picker-list-scroll"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { URL_LIST_COMMAND_LISTING_HINT } from "../side-picker/interaction/url-list-commands"
import { searchPickerSourceLabel, type PickerEntry } from "../side-picker/model/picker-entry"
import { useSearchPickerAltPreviewKit } from "./use-search-picker-alt-preview-kit"
import { excerptAroundNeedle } from "./search-picker-excerpt"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import { SearchPickerHighlight } from "./search-picker-highlight"
import { SearchPickerBreadcrumb } from "./search-picker-breadcrumb"
import { pickPageMatchForDisplay } from "./search-picker-page-match"
import { SearchOpenDestinationPickerRow } from "./search-open-destination-picker-row"
import type { SearchOpenDestinationRow } from "./search-open-destination"
import { resolveSearchHighlightAppearance, useUiSettings } from "../setting"

const ROW_ID_PREFIX = "bmxt-search-row"

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
  pattern,
  entry
}: {
  index: number
  hit: SearchEntryDetailHit
  hi: number
  pattern: string
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
          <SearchPickerHighlight text={hit.displayText} needle={pattern} />
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
  matchHi
}: {
  index: number
  entry: PickerEntry
  hi: number
  pattern: string
  matchHi: number
}): ReactNode {
  const hiRow = index === hi
  const pageMatch = pickPageMatchForDisplay(entry.pageMatches, hiRow ? matchHi : 0)
  const showText = pageMatch != null && pageMatch.snippet.trim().length > 0
  const textExcerpt = pageMatch ? excerptAroundNeedle(pageMatch.snippet, pattern) : ""

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
          <SearchPickerHighlight text={entry.title.trim() || entry.url} needle={pattern} />
        </div>
      </div>
      {showText ? (
        <div className="bmxt-search-picker-field">
          <div className="bmxt-search-picker-field-label">text:</div>
          <div className="bmxt-search-picker-text">
            <SearchPickerHighlight text={textExcerpt} needle={pattern} />
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
  destinationFromDetail = false
}: SearchListPickerBodyProps) {
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
  const [hi, setHiState] = useState(0)
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)

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
  const listResetKey = inDestinationView
    ? `destination-${destinationRows.length}`
    : inDetailView
      ? `detail-${detailEntry?.id ?? ""}-${detailHits.length}`
      : `results-${entries.length}`

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
      }
    }
  }, [listResetKey, statusLines, statusOnly, inDetailView, resultsFocusHi])

  useEffect(() => {
    if (lineCount === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lineCount - 1))
  }, [lineCount])

  useEffect(() => {
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

  const { mergedExtensions, previewNotice, listScrollHintRef } = useSearchPickerAltPreviewKit({
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
    baseExtensions: extensions
  })

  const followListScrollToHi = useCallback(() => {
    const hint = listScrollHintRef.current
    listScrollHintRef.current = null
    const scrollOptions = hint?.alignStart ? { alignStart: true as const } : undefined
    if (hint?.animated) {
      scrollPickerListToHiAnimated(listRef.current, ROW_ID_PREFIX, hi, scrollOptions)
      return
    }
    scrollPickerListToHiAfterLayout(listRef.current, ROW_ID_PREFIX, hi, scrollOptions)
  }, [hi, listScrollHintRef])

  useLayoutEffect(() => {
    if (lineCount === 0) {
      return
    }
    followListScrollToHi()
  }, [followListScrollToHi, lineCount, matchHi, pickerView])

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
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label={listAriaLabel}
        aria-activedescendant={activeRowId}>
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
              pattern={pattern}
              entry={detailEntry}
            />
          ))
        ) : (
          entries.map((entry, i) => (
            <SearchListPickerRow
              key={entry.id}
              index={i}
              entry={entry}
              hi={hi}
              pattern={pattern}
              matchHi={matchHi}
            />
          ))
        )}
      </div>
      {searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <PickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={URL_LIST_COMMAND_LISTING_HINT}
          ambiguousPlaceholder={null}
        />
      ) : null}
    </div>
  )
}
