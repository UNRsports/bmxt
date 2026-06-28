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
import {
  computePickerSearchJumpTarget,
  pickerSearchJumpDirection
} from "../side-picker/interaction/picker-search-jump"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import { plainPickerLineHighlightSegments, plainPickerHiIndicesMatching } from "../side-picker/search/plain-picker-search"
import { scrollDomPickerListToHi } from "./dom-picker-list-scroll"
import type { DomListFlavor } from "./dom-picker-mode"
import { captureDomSemanticForTab } from "./dom-semantic-capture"
import {
  DOM_SEMANTIC_KINDS,
  domSemanticKindI18nKey,
  type DomSemanticKind
} from "./dom-semantic-kind"
import {
  activateDomListLinkAtPath,
  clearDomListTargetHighlight,
  jumpDomListTargetToPath,
  previewDomListTargetToPath
} from "./dom-scroll-to-path"
import { scrollDomListTargetPage } from "./dom-scroll-page"
import type { DomPageActiveMode } from "./page-active-setting"
import type { DomListCapture } from "./dom-list-capture"
import {
  classifyDomPickerLine,
  parseDomTreeTagParts,
  type DomPickerRowKind
} from "./dom-list-line-format"
import { adjacentDomFocusHi, firstFocusableDomLineIndex } from "./dom-list-nav"
import {
  bodyEntriesFromCapture,
  documentEntryAt,
  documentLinesFromEntries,
  findDisplayIndexForPath
} from "./dom-with-document-store"
import type { DomTreeEntry } from "./dom-list-capture"
import { DomHtmlSnippetView } from "./dom-html-snippet-view"
import type { DomListPickerBodyProps } from "./dom-list-picker-body"

const ROW_ID_PREFIX = "bmxt-dom-row"
const MENU_ROW_ID_PREFIX = "bmxt-dom-semantic-row"
const VIEWPORT_REFRESH_DELAY_MS = 150

type WithPickerView = "viewport" | "semanticMenu" | "semanticFilter"

function DomFlatRowContent({ line }: { line: string }): ReactNode {
  if (line.startsWith("<")) {
    return <DomHtmlSnippetView snippet={line} />
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
  searchHighlightQuery,
  showTag
}: {
  index: number
  line: string
  hi: number
  rowKind: DomPickerRowKind
  searchHighlightQuery: string
  showTag: boolean
}): ReactNode {
  const hiRow = index === hi
  const rowClass = `bmxt-dom-picker-row bmxt-dom-picker-row--${rowKind}${
    hiRow ? " bmxt-dom-picker-row--hi" : ""
  }`
  const useTagContent = rowKind === "tree" && showTag

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={rowClass}>
      {useTagContent ? (
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

function DomSemanticMenuRow({
  index,
  label,
  hi
}: {
  index: number
  label: string
  hi: number
}): ReactNode {
  const hiRow = index === hi
  return (
    <div
      id={`${MENU_ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={`bmxt-dom-picker-row bmxt-dom-picker-row--plain${
        hiRow ? " bmxt-dom-picker-row--hi" : ""
      }`}>
      <span className="bmxt-dom-picker-plain">{label}</span>
    </div>
  )
}

export type DomListPickerBodyWithProps = DomListPickerBodyProps & {
  flavor?: DomListFlavor
  onRefreshViewport: () => Promise<DomListCapture | null>
  onViewportCapture: (capture: DomListCapture) => void
}

/** EN: `--with` — ↑↓ page scroll; Alt+↑↓ list highlight; → semantic menu (filter syncs to viewport). */
export function DomListPickerBodyWith({
  headline,
  lines,
  jumpPaths,
  headerLineCount,
  targetTabId,
  flavor = "--html",
  showTag = false,
  documentEntries,
  jumpActiveMode: _jumpActiveMode = "auto",
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
  const hiRef = useRef(0)
  const refreshInFlightRef = useRef(false)
  const semanticCaptureInFlightRef = useRef(false)
  const withViewRef = useRef<WithPickerView>("viewport")
  const documentEntriesRef = useRef<readonly DomTreeEntry[]>(documentEntries ?? [])
  const semanticDocumentEntriesRef = useRef<readonly DomTreeEntry[]>([])
  const searchDocHiRef = useRef(-1)
  const [hi, setHi] = useState(0)
  const [withView, setWithView] = useState<WithPickerView>("viewport")
  const [semanticMenuHi, setSemanticMenuHi] = useState(0)
  const [activeSemanticKind, setActiveSemanticKind] = useState<DomSemanticKind | null>(null)
  const activeSemanticKindRef = useRef<DomSemanticKind | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const [hlSearchPattern, setHlSearchPattern] = useState("")
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState("")
  const [commandListingHint, setCommandListingHint] = useState(false)

  hiRef.current = hi
  withViewRef.current = withView
  activeSemanticKindRef.current = activeSemanticKind

  useEffect(() => {
    jumpPathsRef.current = jumpPaths
  }, [jumpPaths])

  useEffect(() => {
    targetTabIdRef.current = targetTabId
  }, [targetTabId])

  useEffect(() => {
    if (documentEntries) {
      documentEntriesRef.current = documentEntries
    }
  }, [documentEntries])

  const getDocumentEntriesForSearch = useCallback((): readonly DomTreeEntry[] => {
    if (withViewRef.current === "semanticFilter") {
      return semanticDocumentEntriesRef.current
    }
    return documentEntriesRef.current
  }, [])

  useEffect(() => {
    if (hlSearchPattern === "") {
      searchDocHiRef.current = -1
      return
    }
    const entries = getDocumentEntriesForSearch()
    const docLines = documentLinesFromEntries(entries)
    const matches = plainPickerHiIndicesMatching(docLines, hlSearchPattern)
    searchDocHiRef.current = matches[0] ?? -1
  }, [activeSemanticKind, documentEntries, getDocumentEntriesForSearch, hlSearchPattern, withView])

  const refreshDisplayedCapture = useCallback(async (): Promise<DomListCapture | null> => {
    const tabId = targetTabIdRef.current
    if (tabId === undefined) {
      return null
    }
    if (withViewRef.current === "semanticFilter") {
      const kind = activeSemanticKindRef.current
      if (kind === null) {
        return null
      }
      const tab = await chrome.tabs.get(tabId)
      return captureDomSemanticForTab(tab, flavor, kind, locale, "viewport", showTag)
    }
    return onRefreshViewport()
  }, [flavor, locale, onRefreshViewport, showTag])

  const applyDisplayedCapture = useCallback(
    (capture: DomListCapture, preferredPath?: readonly number[]): number => {
      onViewportCapture(capture)
      jumpPathsRef.current = capture.jumpPaths
      if (preferredPath !== undefined) {
        const matched = findDisplayIndexForPath(capture, preferredPath)
        if (matched >= 0) {
          return matched
        }
      }
      const first = firstFocusableDomLineIndex(capture.jumpPaths)
      return first >= 0 ? first : 0
    },
    [onViewportCapture]
  )

  const jumpToDocumentEntry = useCallback(
    async (docIndex: number): Promise<void> => {
      const entry = documentEntryAt(getDocumentEntriesForSearch(), docIndex)
      const tabId = targetTabIdRef.current
      if (entry == null || tabId === undefined) {
        return
      }
      searchDocHiRef.current = docIndex
      await jumpDomListTargetToPath(tabId, entry.path, {
        focusWindow: false,
        persistHighlight: true,
        instantScroll: true
      })
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, VIEWPORT_REFRESH_DELAY_MS)
      })
      let capture = await refreshDisplayedCapture()
      if (!capture) {
        return
      }
      if (findDisplayIndexForPath(capture, entry.path) < 0) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, VIEWPORT_REFRESH_DELAY_MS)
        })
        capture = await refreshDisplayedCapture()
        if (!capture) {
          return
        }
      }
      const nextHi = applyDisplayedCapture(capture, entry.path)
      setHi(nextHi)
    },
    [applyDisplayedCapture, getDocumentEntriesForSearch, refreshDisplayedCapture]
  )

  const onSearchCommit = useCallback(
    (pattern: string) => {
      if (withViewRef.current === "semanticMenu") {
        return
      }
      const entries = getDocumentEntriesForSearch()
      const docLines = documentLinesFromEntries(entries)
      const matches = plainPickerHiIndicesMatching(docLines, pattern)
      const first = matches[0]
      if (first === undefined) {
        return
      }
      void jumpToDocumentEntry(first)
    },
    [getDocumentEntriesForSearch, jumpToDocumentEntry]
  )

  const previewRow = useCallback(async (index: number): Promise<void> => {
    const path = jumpPathsRef.current[index]
    const tabId = targetTabIdRef.current
    if (path == null || tabId === undefined) {
      return
    }
    await previewDomListTargetToPath(tabId, path)
  }, [])

  const jumpToRow = useCallback(async (index: number, focusWindow: boolean): Promise<void> => {
    const path = jumpPathsRef.current[index]
    const tabId = targetTabIdRef.current
    if (path == null || tabId === undefined) {
      return
    }
    await jumpDomListTargetToPath(tabId, path, { focusWindow, persistHighlight: true })
  }, [])

  const onConfirmLineIndex = useCallback(
    (index: number) => {
      if (withViewRef.current !== "viewport" && withViewRef.current !== "semanticFilter") {
        return
      }
      const path = jumpPathsRef.current[index]
      const tabId = targetTabIdRef.current
      if (path == null || tabId === undefined) {
        return
      }
      if (
        withViewRef.current === "semanticFilter" &&
        activeSemanticKindRef.current === "link"
      ) {
        void activateDomListLinkAtPath(tabId, path, { focusWindow: true })
        return
      }
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

  const clearSearchState = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
    setHlSearchPattern("")
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
  }, [])

  const resetListHi = useCallback(() => {
    const first = firstFocusableDomLineIndex(jumpPathsRef.current)
    setHi(first >= 0 ? first : 0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
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
        const view = withViewRef.current
        let capture: DomListCapture | null = null
        if (view === "semanticFilter") {
          const kind = activeSemanticKindRef.current
          if (kind !== null) {
            const tab = await chrome.tabs.get(tabId)
            capture = await captureDomSemanticForTab(tab, flavor, kind, locale, "viewport", showTag)
          }
        } else {
          capture = await onRefreshViewport()
        }
        if (capture) {
          onViewportCapture(capture)
          jumpPathsRef.current = capture.jumpPaths
          if (hlSearchPattern === "") {
            resetListHi()
          }
        }
      } finally {
        refreshInFlightRef.current = false
      }
    },
    [flavor, hlSearchPattern, locale, onRefreshViewport, onViewportCapture, resetListHi, showTag]
  )

  const restoreViewportList = useCallback(async () => {
    if (semanticCaptureInFlightRef.current) {
      return
    }
    clearSearchState()
    semanticDocumentEntriesRef.current = []
    const capture = await onRefreshViewport()
    if (capture) {
      onViewportCapture(capture)
    }
    setWithView("viewport")
    setActiveSemanticKind(null)
    resetListHi()
  }, [clearSearchState, onRefreshViewport, onViewportCapture, resetListHi])

  const selectSemanticKind = useCallback(
    async (kind: DomSemanticKind) => {
      const tabId = targetTabIdRef.current
      if (tabId === undefined || semanticCaptureInFlightRef.current) {
        return
      }
      clearSearchState()
      semanticCaptureInFlightRef.current = true
      try {
        const tab = await chrome.tabs.get(tabId)
        const [documentCapture, viewportCapture] = await Promise.all([
          captureDomSemanticForTab(tab, flavor, kind, locale, "document", showTag),
          captureDomSemanticForTab(tab, flavor, kind, locale, "viewport", showTag)
        ])
        semanticDocumentEntriesRef.current = bodyEntriesFromCapture(documentCapture)
        onViewportCapture(viewportCapture)
        setActiveSemanticKind(kind)
        setWithView("semanticFilter")
        const first = firstFocusableDomLineIndex(viewportCapture.jumpPaths)
        const nextHi = first >= 0 ? first : 0
        setHi(nextHi)
        jumpPathsRef.current = viewportCapture.jumpPaths
        const path = viewportCapture.jumpPaths[nextHi]
        if (path != null) {
          await previewDomListTargetToPath(tabId, path)
        }
      } finally {
        semanticCaptureInFlightRef.current = false
      }
    },
    [clearSearchState, flavor, locale, onViewportCapture, showTag]
  )

  useEffect(() => {
    if (withView !== "viewport" && withView !== "semanticFilter") {
      return
    }
    resetListHi()
  }, [resetListHi, withView])

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
    return () => {
      const tabId = targetTabIdRef.current
      if (tabId !== undefined) {
        void clearDomListTargetHighlight(tabId)
      }
    }
  }, [])

  const moveListHighlight = useCallback(
    (delta: 1 | -1) => {
      const next = adjacentDomFocusHi(
        hiRef.current,
        delta,
        jumpPathsRef.current,
        lines.length
      )
      setHi(next)
      void previewRow(next)
    },
    [lines.length, previewRow]
  )

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
      const view = withViewRef.current
      if (view === "semanticMenu") {
        e.preventDefault()
        e.stopPropagation()
        setSemanticMenuHi((h) => {
          const max = DOM_SEMANTIC_KINDS.length - 1
          return dir === "down" ? Math.min(h + 1, max) : Math.max(h - 1, 0)
        })
        return true
      }
      if (view === "semanticFilter") {
        if (e.altKey) {
          e.preventDefault()
          e.stopPropagation()
          moveListHighlight(dir === "down" ? 1 : -1)
          return true
        }
        e.preventDefault()
        e.stopPropagation()
        void scrollPageAndRefresh(dir === "down" ? 1 : -1)
        return true
      }
      if (e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        moveListHighlight(dir === "down" ? 1 : -1)
        return true
      }
      e.preventDefault()
      e.stopPropagation()
      void scrollPageAndRefresh(dir === "down" ? 1 : -1)
      return true
    },
    [commandMode, keyboardActive, moveListHighlight, scrollPageAndRefresh, searchMode]
  )

  const domSearchMatchIndices = useCallback((): number[] => {
    const docLines = documentLinesFromEntries(getDocumentEntriesForSearch())
    return plainPickerHiIndicesMatching(docLines, hlSearchPattern)
  }, [getDocumentEntriesForSearch, hlSearchPattern])

  const onDocumentSearchCaptureBefore = useCallback(
    (ev: KeyboardEvent): boolean => {
      if (
        !keyboardActive ||
        searchMode ||
        commandMode ||
        hlSearchPattern === "" ||
        withViewRef.current === "semanticMenu"
      ) {
        return false
      }
      const dir = pickerSearchJumpDirection(ev)
      if (dir === null) {
        return false
      }
      const matches = domSearchMatchIndices()
      if (matches.length === 0) {
        pickerStopEvent(ev)
        return true
      }
      const cur = searchDocHiRef.current
      const curIdx = cur >= 0 && matches.includes(cur) ? cur : matches[0]!
      const target = computePickerSearchJumpTarget(curIdx, matches, dir === "forward")
      pickerStopEvent(ev)
      void jumpToDocumentEntry(target)
      return true
    },
    [
      commandMode,
      domSearchMatchIndices,
      hlSearchPattern,
      jumpToDocumentEntry,
      keyboardActive,
      searchMode
    ]
  )

  const blockPickerChords = withView === "semanticMenu"

  const extensions = useMemo(
    () => ({
      onCaptureBefore: onDocumentSearchCaptureBefore,
      customVerticalNav: domWithVerticalNav,
      blockOpenChords: () => blockPickerChords,
      isSearchJumpEnabled: () => false,
      onInputBeforePlain: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!keyboardActive || searchMode || commandMode) {
          return false
        }
        const view = withViewRef.current
        if (e.key === "ArrowRight" || e.code === "ArrowRight") {
          if (view !== "viewport") {
            return false
          }
          e.preventDefault()
          clearSearchState()
          setSemanticMenuHi(0)
          setWithView("semanticMenu")
          return true
        }
        if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
          if (view === "semanticMenu") {
            e.preventDefault()
            setWithView("viewport")
            return true
          }
          if (view === "semanticFilter") {
            e.preventDefault()
            void restoreViewportList()
            return true
          }
        }
        return false
      },
      onNormalEnter:
        withView === "semanticMenu"
          ? (e: KeyboardEvent) => {
              if (!keyboardActive || searchMode || commandMode) {
                return false
              }
              e.preventDefault()
              e.stopPropagation()
              const kind = DOM_SEMANTIC_KINDS[semanticMenuHi]
              if (kind) {
                void selectSemanticKind(kind)
              }
              return true
            }
          : undefined,
      onEsc: (e: KeyboardEvent) => {
        if (searchMode || commandMode) {
          return false
        }
        const view = withViewRef.current
        if (view === "semanticMenu") {
          e.preventDefault()
          e.stopPropagation()
          setWithView("viewport")
          return true
        }
        if (view === "semanticFilter") {
          e.preventDefault()
          e.stopPropagation()
          void restoreViewportList()
          return true
        }
        return false
      },
      exitToDetailBar:
        onExitToDetailBar && !searchMode && !commandMode && !blockPickerChords
          ? {
              canExit: () => !searchMode && !commandMode && withViewRef.current === "viewport",
              onExit: onExitToDetailBar
            }
          : undefined
    }),
    [
      blockPickerChords,
      clearSearchState,
      commandMode,
      domWithVerticalNav,
      keyboardActive,
      onDocumentSearchCaptureBefore,
      onExitToDetailBar,
      restoreViewportList,
      searchMode,
      selectSemanticKind,
      semanticMenuHi,
      withView
    ]
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
    onSearchCommit,
    extensions
  })

  const pickerHeadline =
    withView === "semanticMenu"
      ? tDom("dom.picker.semantic.menuHeadline", locale)
      : withView === "semanticFilter" && activeSemanticKind
        ? activeSemanticKind === "link"
          ? tDom("dom.picker.semantic.filterHeadlineLink", locale, {
              kind: tDom(domSemanticKindI18nKey(activeSemanticKind), locale)
            })
          : tDom("dom.picker.semantic.filterHeadline", locale, {
              kind: tDom(domSemanticKindI18nKey(activeSemanticKind), locale)
            })
        : headline

  const activeRowId =
    withView === "semanticMenu"
      ? `${MENU_ROW_ID_PREFIX}-${semanticMenuHi}`
      : lines.length > 0 && hi >= 0 && hi < lines.length
        ? `${ROW_ID_PREFIX}-${hi}`
        : undefined

  useLayoutEffect(() => {
    if (withView === "semanticMenu") {
      scrollDomPickerListToHi(listRef.current, MENU_ROW_ID_PREFIX, semanticMenuHi)
      return
    }
    if (lines.length === 0) {
      return
    }
    scrollDomPickerListToHi(listRef.current, ROW_ID_PREFIX, hi)
  }, [hi, lines.length, semanticMenuHi, withView])

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-dom-picker bmxt-dom-picker--with">
      <div className="bmxt-tab-picker-head">{pickerHeadline}</div>
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
              : withView === "semanticFilter"
                ? activeSemanticKind === "link"
                  ? tDom("dom.picker.inputAria.keysWithSemanticFilterLink", locale)
                  : tDom("dom.picker.inputAria.keysWithSemanticFilter", locale)
                : withView === "semanticMenu"
                ? tDom("dom.picker.semantic.menuAria", locale)
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
        aria-label={
          withView === "semanticMenu"
            ? tDom("dom.picker.semantic.menuAria", locale)
            : tDom("dom.picker.listAria", locale)
        }
        aria-activedescendant={activeRowId}>
        {withView === "semanticMenu" ? (
          DOM_SEMANTIC_KINDS.map((kind, i) => (
            <DomSemanticMenuRow
              key={kind}
              index={i}
              label={tDom(domSemanticKindI18nKey(kind), locale)}
              hi={semanticMenuHi}
            />
          ))
        ) : lines.length === 0 ? (
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
              showTag={showTag}
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
