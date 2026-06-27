import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode
} from "react"
import { tPlainPicker } from "../setting/i18n/ns/plain-picker"
import { tDom } from "../setting/i18n/ns/dom"
import { useUiSettings } from "../setting/use-ui-settings"
import { PickerCommandFooter } from "../side-picker/chrome/picker-command-footer"
import { PickerSearchFooter } from "../side-picker/chrome/picker-search-footer"
import { usePlainPickerKeyboard } from "../side-picker/hooks/use-plain-picker-keyboard"
import { urlListCommandListingHint } from "../side-picker/interaction/url-list-commands"
import { verticalNavDirection } from "../side-picker/interaction/picker-vertical-nav"
import { plainPickerLineHighlightSegments } from "../side-picker/search/plain-picker-search"
import { scrollDomPickerListToHi } from "./dom-picker-list-scroll"
import { jumpDomListTargetToPath } from "./dom-scroll-to-path"
import { scrollDomListTargetPage } from "./dom-scroll-page"
import type { DomPageActiveMode } from "./page-active-setting"
import type { DomListCapture } from "./dom-list-capture"
import {
  classifyDomPickerLine,
  parseDomTreeTagParts,
  type DomPickerRowKind
} from "./dom-list-line-format"
import { firstFocusableDomLineIndex } from "./dom-list-nav"
import type { DomListPickerBodyProps } from "./dom-list-picker-body"

const ROW_ID_PREFIX = "bmxt-dom-row"
const PICKER_INTERNAL_SCROLL_PX = 48
const VIEWPORT_REFRESH_DELAY_MS = 150

function DomFlatRowContent({ line }: { line: string }): ReactNode {
  if (line.startsWith("<")) {
    return <span className="bmxt-dom-picker-html">{line}</span>
  }
  const parts = parseDomTreeTagParts(line)
  return (
    <>
      <span className="bmxt-dom-picker-tag">{parts.tag}</span>
      {parts.idPart ? <span className="bmxt-dom-picker-id">{parts.idPart}</span> : null}
      {parts.classPart ? <span className="bmxt-dom-picker-class">{parts.classPart}</span> : null}
      {parts.suffix ? <span className="bmxt-dom-picker-suffix">{parts.suffix}</span> : null}
    </>
  )
}

function DomWithPickerRow({
  index,
  line,
  hi,
  rowKind,
  searchHighlightQuery
}: {
  index: number
  line: string
  hi: number
  rowKind: DomPickerRowKind
  searchHighlightQuery: string
}): ReactNode {
  const hiRow = index === hi
  const rowClass = `bmxt-dom-picker-row bmxt-dom-picker-row--${rowKind}${
    hiRow ? " bmxt-dom-picker-row--hi" : ""
  }`

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={rowClass}>
      {rowKind === "tree" ? (
        <DomFlatRowContent line={line} />
      ) : (
        plainPickerLineHighlightSegments(line, searchHighlightQuery).map((seg, i) =>
          seg.match ? (
            <mark key={i} className="bmxt-tab-picker-search-hl">
              {seg.text || "\u00a0"}
            </mark>
          ) : (
            <span key={i}>{seg.text || "\u00a0"}</span>
          )
        )
      )}
    </div>
  )
}

export type DomListPickerBodyWithProps = DomListPickerBodyProps & {
  onRefreshViewport: () => Promise<DomListCapture | null>
  onViewportCapture: (capture: DomListCapture) => void
}

/** EN: `--with` — ↑↓ scrolls page; Alt+↑↓ scrolls picker list; Enter jumps. */
export function DomListPickerBodyWith({
  headline,
  lines,
  jumpPaths,
  headerLineCount,
  targetTabId,
  jumpActiveMode = "auto",
  onReturnToPrompt,
  onExitToDetailBar,
  keyboardActive = false,
  pickerInputRef,
  sessionId,
  onRefreshViewport,
  onViewportCapture
}: DomListPickerBodyWithProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
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
  const jumpPathsRef = useRef(jumpPaths)
  const targetTabIdRef = useRef(targetTabId)
  const refreshInFlightRef = useRef(false)
  const [hi, setHi] = useState(0)
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)

  useEffect(() => {
    jumpPathsRef.current = jumpPaths
  }, [jumpPaths])

  useEffect(() => {
    targetTabIdRef.current = targetTabId
  }, [targetTabId])

  const jumpToRow = useCallback(async (index: number, focusWindow: boolean): Promise<void> => {
    const path = jumpPathsRef.current[index]
    const tabId = targetTabIdRef.current
    if (path == null || tabId === undefined) {
      return
    }
    await jumpDomListTargetToPath(tabId, path, { focusWindow })
  }, [])

  const onConfirmLineIndex = useCallback(
    (index: number) => {
      void jumpToRow(index, true)
    },
    [jumpToRow]
  )

  const rowKinds = useMemo(
    () =>
      lines.map((line, i) => classifyDomPickerLine(line, i, headerLineCount, jumpPaths)),
    [headerLineCount, jumpPaths, lines]
  )

  const searchHighlightQuery = searchMode ? filterQuery : hlSearchPattern

  const scrollPickerInternal = useCallback((direction: 1 | -1) => {
    const el = listRef.current
    if (!el) {
      return
    }
    el.scrollBy({ top: direction * PICKER_INTERNAL_SCROLL_PX, behavior: "auto" })
  }, [])

  const scrollPageAndRefresh = useCallback(
    async (direction: 1 | -1) => {
      const tabId = targetTabIdRef.current
      if (tabId === undefined || refreshInFlightRef.current) {
        return
      }
      refreshInFlightRef.current = true
      try {
        await scrollDomListTargetPage(tabId, direction)
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, VIEWPORT_REFRESH_DELAY_MS)
        })
        const capture = await onRefreshViewport()
        if (capture) {
          onViewportCapture(capture)
        }
      } finally {
        refreshInFlightRef.current = false
      }
    },
    [onRefreshViewport, onViewportCapture]
  )

  useEffect(() => {
    const first = firstFocusableDomLineIndex(jumpPaths)
    setHi(first >= 0 ? first : 0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [jumpPaths, lines])

  useEffect(() => {
    if (lines.length === 0) {
      return
    }
    setHi((h) => Math.min(Math.max(0, h), lines.length - 1))
  }, [lines.length])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    }
  }, [keyboardActive])

  useEffect(() => {
    if (!keyboardActive || jumpActiveMode !== "auto") {
      return
    }
    const path = jumpPaths[hi]
    if (path == null || targetTabId === undefined) {
      return
    }
    void jumpDomListTargetToPath(targetTabId, path, { focusWindow: false })
  }, [hi, jumpActiveMode, jumpPaths, keyboardActive, lines, targetTabId])

  const domWithVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || e.ctrlKey || e.metaKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || searchMode || commandMode) {
        return false
      }
      const dir = verticalNavDirection(e)
      if (dir === null) {
        return false
      }
      if (e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        scrollPickerInternal(dir === "down" ? 1 : -1)
        return true
      }
      e.preventDefault()
      e.stopPropagation()
      void scrollPageAndRefresh(dir === "down" ? 1 : -1)
      return true
    },
    [commandMode, keyboardActive, scrollPageAndRefresh, scrollPickerInternal, searchMode]
  )

  const extensions = useMemo(
    () => ({
      customVerticalNav: domWithVerticalNav,
      exitToDetailBar:
        onExitToDetailBar && !searchMode && !commandMode
          ? {
              canExit: () => !searchMode && !commandMode,
              onExit: onExitToDetailBar
            }
          : undefined
    }),
    [commandMode, domWithVerticalNav, onExitToDetailBar, searchMode]
  )

  const { onInputKeyDown } = usePlainPickerKeyboard({
    lineCount: lines.length,
    keyboardActive,
    sessionId,
    enableCommandMode: true,
    onReturnToPrompt,
    onConfirmLineIndex,
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
    matchLines: lines,
    extensions
  })

  const activeRowId =
    lines.length > 0 && hi >= 0 && hi < lines.length ? `${ROW_ID_PREFIX}-${hi}` : undefined

  useLayoutEffect(() => {
    if (lines.length === 0) {
      return
    }
    scrollDomPickerListToHi(listRef.current, ROW_ID_PREFIX, hi)
  }, [hi, lines.length])

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-dom-picker bmxt-dom-picker--with">
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
          searchMode
            ? tPlainPicker("plainPicker.searchHint", locale)
            : commandMode
              ? tPlainPicker("plainPicker.commandHint", locale)
              : tDom("dom.picker.inputAria.keysWith", locale)
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
        className="bmxt-tab-picker-list bmxt-dom-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label={tDom("dom.picker.listAria", locale)}
        aria-activedescendant={activeRowId}>
        {lines.length === 0 ? (
          <div className="bmxt-tab-picker-empty">{tPlainPicker("plainPicker.noOutput", locale)}</div>
        ) : (
          lines.map((line, i) => (
            <DomWithPickerRow
              key={i}
              index={i}
              line={line}
              hi={hi}
              rowKind={rowKinds[i]!}
              searchHighlightQuery={searchHighlightQuery}
            />
          ))
        )}
      </div>
      {searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
      {commandMode ? (
        <PickerCommandFooter
          commandBuffer={commandBuffer}
          showListingHint={commandListingHint}
          listingHintText={urlListCommandListingHint(locale)}
          ambiguousPlaceholder={null}
        />
      ) : null}
    </div>
  )
}
