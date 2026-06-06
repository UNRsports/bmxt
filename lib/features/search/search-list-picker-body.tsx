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
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { URL_LIST_COMMAND_LISTING_HINT } from "../side-picker/interaction/url-list-commands"
import { searchPickerSourceLabel, type PickerEntry } from "../side-picker/model/picker-entry"
import { excerptAroundNeedle } from "./search-picker-excerpt"
import { SearchPickerHighlight } from "./search-picker-highlight"
import { pickPageMatchForDisplay } from "./search-picker-page-match"

const ROW_ID_PREFIX = "bmxt-search-row"

export type SearchListPickerBodyProps = {
  headline: string
  entries: PickerEntry[]
  /** EN: Pattern from `search -list …` — highlighted in title / text rows. */
  pattern: string
  /** EN: Status lines while loading or when there are no openable rows. */
  statusLines?: string[]
  statusOnly?: boolean
  matchHi?: number
  onReturnToPrompt: () => void
  onConfirmLineIndex?: (index: number) => void
  enableCommandMode?: boolean
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  extensions?: PlainPickerKeyboardExtensions
  onHiChange?: (hi: number) => void
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
  onReturnToPrompt,
  onConfirmLineIndex,
  enableCommandMode = false,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  extensions,
  onHiChange
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
  const setHi = useCallback(
    (action: SetStateAction<number>) => {
      setHiState((prev) => {
        const next = typeof action === "function" ? action(prev) : action
        onHiChange?.(next)
        return next
      })
    },
    [onHiChange]
  )
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)

  const lineCount = statusOnly ? statusLines.length : entries.length
  const matchLines = useMemo(
    () => (statusOnly ? statusLines : entries.map((e) => e.title)),
    [entries, statusLines, statusOnly]
  )

  useEffect(() => {
    setHi(statusOnly && statusLines.length > 0 ? statusLines.length - 1 : 0)
    setSearchMode(false)
    setFilterQuery("")
    setHlSearchPattern("")
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
    if (listRef.current) {
      if (statusOnly && statusLines.length > 0) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      } else {
        listRef.current.scrollTop = 0
      }
    }
  }, [entries, statusLines, statusOnly])

  useEffect(() => {
    if (lineCount === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lineCount - 1))
  }, [lineCount])

  useLayoutEffect(() => {
    if (lineCount === 0) {
      return
    }
    document.getElementById(`${ROW_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [hi, lineCount, entries, statusLines, matchHi])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    } else {
      inputRef.current?.blur()
    }
  }, [keyboardActive])

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: statusOnly ? 0 : lineCount,
    keyboardActive,
    sessionId,
    enableCommandMode: statusOnly ? false : enableCommandMode,
    onReturnToPrompt,
    onConfirmLineIndex: statusOnly ? undefined : onConfirmLineIndex,
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
    extensions
  })

  const activeRowId =
    lineCount > 0 && hi >= 0 && hi < lineCount ? `${ROW_ID_PREFIX}-${hi}` : undefined

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-search-picker">
      <div className="bmxt-tab-picker-head">{headline}</div>
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
        aria-label="Search results"
        aria-activedescendant={activeRowId}>
        {lineCount === 0 ? (
          <div className="bmxt-tab-picker-empty">(no output)</div>
        ) : statusOnly ? (
          statusLines.map((line, i) => (
            <SearchListStatusRow key={i} index={i} line={line} hi={hi} />
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
