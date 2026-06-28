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
import { useDomPickerJumpPreview } from "./use-dom-picker-jump-preview"
import type { DomPageActiveMode } from "./page-active-setting"
import {
  classifyDomPickerLine,
  parseDomTreeTagParts,
  type DomPickerRowKind
} from "./dom-list-line-format"
import { adjacentDomFocusHi, firstFocusableDomLineIndex } from "./dom-list-nav"
import { DomHtmlSnippetView } from "./dom-html-snippet-view"
import { DomListPickerBodyWith } from "./dom-list-picker-body-with"
import type { DomListCapture, DomTreeEntry } from "./dom-list-capture"
import type { DomListFlavor, DomPickerMode } from "./dom-picker-mode"

const ROW_ID_PREFIX = "bmxt-dom-row"

export type DomListPickerBodyProps = {
  headline: string
  lines: string[]
  jumpPaths: readonly (readonly number[] | null)[]
  headerLineCount: number
  targetTabId?: number
  jumpActiveMode?: DomPageActiveMode
  pickerMode?: DomPickerMode
  flavor?: DomListFlavor
  showTag?: boolean
  documentEntries?: readonly DomTreeEntry[]
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
  onRefreshViewport?: () => Promise<DomListCapture | null>
  onViewportCapture?: (capture: DomListCapture) => void
}

type DomListPickerBodyRouterProps = DomListPickerBodyProps

export function DomListPickerBody(props: DomListPickerBodyRouterProps) {
  if (props.pickerMode === "with") {
    if (!props.onRefreshViewport || !props.onViewportCapture) {
      return <DomListPickerBodyNormal {...props} />
    }
    return (
      <DomListPickerBodyWith
        {...props}
        onRefreshViewport={props.onRefreshViewport}
        onViewportCapture={props.onViewportCapture}
      />
    )
  }
  return <DomListPickerBodyNormal {...props} />
}

function DomListPickerBodyNormal({
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
  sessionId
}: DomListPickerBodyProps) {
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

  const followListScrollToHi = useCallback(() => {
    scrollDomPickerListToHi(listRef.current, ROW_ID_PREFIX, hi)
    requestAnimationFrame(() => {
      scrollDomPickerListToHi(listRef.current, ROW_ID_PREFIX, hi)
    })
  }, [hi])

  useEffect(() => {
    const first = firstFocusableDomLineIndex(jumpPaths)
    setHi(first >= 0 ? first : 0)
    setSearchMode(false)
    setFilterQuery("")
    setHlSearchPattern("")
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
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
    if (lines.length === 0) {
      return
    }
    followListScrollToHi()
  }, [followListScrollToHi, lines.length])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    }
  }, [keyboardActive])

  useDomPickerJumpPreview({
    enabled: keyboardActive,
    isHostPaneFocused: keyboardActive,
    jumpActiveMode,
    hi,
    jumpPaths,
    targetTabId
  })

  const domVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lines.length === 0) {
        return false
      }
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => adjacentDomFocusHi(h, 1, jumpPathsRef.current, lines.length))
        return true
      }
      if (dir === "up") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => adjacentDomFocusHi(h, -1, jumpPathsRef.current, lines.length))
        return true
      }
      return false
    },
    [keyboardActive, lines.length]
  )

  const extensions = useMemo(
    () => ({
      customVerticalNav: domVerticalNav,
      exitToDetailBar:
        onExitToDetailBar && !searchMode && !commandMode
          ? {
              canExit: () => !searchMode && !commandMode,
              onExit: onExitToDetailBar
            }
          : undefined
    }),
    [commandMode, domVerticalNav, onExitToDetailBar, searchMode]
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

  const renderRows = (start: number, end: number) => {
    const slice: ReactNode[] = []
    for (let i = start; i < end; i++) {
      slice.push(
        <DomListPickerRow
          key={i}
          index={i}
          line={lines[i]!}
          hi={hi}
          rowKind={rowKinds[i]!}
          searchHighlightQuery={searchHighlightQuery}
        />
      )
    }
    return slice
  }

  return (
    <div className="bmxt-tab-picker bmxt-side-picker bmxt-dom-picker">
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
              : tDom("dom.picker.inputAria.keys", locale)
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
          renderRows(0, lines.length)
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

function DomTreeRowContent({ line }: { line: string }): ReactNode {
  const guideMatch = line.match(/^(?:(?:│ )*├ )/)
  const guide = guideMatch ? guideMatch[0] : ""
  const content = line.slice(guide.length)
  const parts = parseDomTreeTagParts(content)
  return (
    <>
      {guide ? <span className="bmxt-dom-picker-guide">{guide}</span> : null}
      <span className="bmxt-dom-picker-tag">{parts.tag}</span>
      {parts.idPart ? <span className="bmxt-dom-picker-id">{parts.idPart}</span> : null}
      {parts.classPart ? <span className="bmxt-dom-picker-class">{parts.classPart}</span> : null}
      {parts.suffix ? <span className="bmxt-dom-picker-suffix">{parts.suffix}</span> : null}
    </>
  )
}

function DomHtmlRowContent({ line }: { line: string }): ReactNode {
  const guideMatch = line.match(/^(?:(?:│ )*├ )/)
  const guide = guideMatch ? guideMatch[0] : ""
  const content = line.slice(guide.length)
  return <DomHtmlSnippetView snippet={content} guide={guide || undefined} />
}

function DomJumpableRowContent({ line }: { line: string }): ReactNode {
  const guideMatch = line.match(/^(?:(?:│ )*├ )/)
  const content = line.slice(guideMatch ? guideMatch[0].length : 0)
  if (content.startsWith("<")) {
    return <DomHtmlRowContent line={line} />
  }
  return <DomTreeRowContent line={line} />
}

function DomListPickerRow({
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
        <DomJumpableRowContent line={line} />
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
