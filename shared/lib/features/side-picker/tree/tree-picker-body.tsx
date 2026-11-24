import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction
} from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../../bmxt-window/csp-dynamic-stylesheet"
import { PickerListShell } from "../chrome/picker-list-shell"
import { PickerSearchFooter } from "../chrome/picker-search-footer"
import { scrollPickerListToHiAfterLayout } from "../interaction/picker-list-scroll"
import {
  computePlainPickerWindow,
  PLAIN_PICKER_VIRTUALIZE_MIN,
  scrollTopForPlainPickerIndex
} from "../plain/plain-text-picker-virtual"
import { useTreePickerKeyboard } from "./use-tree-picker-keyboard"
import type { TreePickerActionMenu, TreePickerRowView } from "./tree-picker-types"

const ROW_ID_PREFIX = "bmxt-tree-row"

/**
 * EN: Visit rows are title + URL; used until the hidden probe is measured.
 * JA: 訪問行（タイトル＋URL）想定。非表示プローブ計測前の推定行高。
 */
const TREE_PICKER_ROW_HEIGHT_FALLBACK = 40

export type TreePickerBodyProps = {
  headline: string
  emptyText: string
  inputAriaLabel: string
  listAriaLabel: string
  views: readonly TreePickerRowView[]
  hi: number
  onHiChange: (next: SetStateAction<number>) => void
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  menu: TreePickerActionMenu | null
  onMenuPickIndexChange: (index: number) => void
  onMenuConfirm: () => void
  onMenuClose: () => void
  onOpenMenu: () => void
  onSetFold: (viewIndex: number, expanded: boolean) => void
  onToggleMark: (viewIndex: number) => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  keyboardActive: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
}

function rowVariantClass(view: TreePickerRowView): string {
  if (view.variant === "window") {
    return "bmxt-tab-picker-row--window"
  }
  if (view.variant === "group") {
    return "bmxt-tab-picker-row--group"
  }
  return "bmxt-tab-picker-row--tab"
}

function TreePickerRowImpl({
  view,
  index,
  isHi,
  onSelect
}: {
  view: TreePickerRowView
  index: number
  isHi: boolean
  onSelect: (index: number) => void
}) {
  const className =
    `bmxt-tab-picker-row ${rowVariantClass(view)}` +
    (view.foldable && !view.expanded ? " bmxt-tab-picker-row--folded" : "") +
    (isHi ? " bmxt-tab-picker-row--hi" : "") +
    (view.marked ? " bmxt-tab-picker-row--marked" : "")
  const indentGlyphs: string[] = []
  for (let i = 0; i < view.indent; i += 1) {
    indentGlyphs.push("\u00a0\u00a0")
  }
  const markGlyph = view.marked ? "#" : " "

  if (view.variant === "tab") {
    return (
      <div
        id={`${ROW_ID_PREFIX}-${index}`}
        role="option"
        aria-selected={isHi || view.marked}
        className={`${className}`}
        onMouseDown={() => onSelect(index)}>
        <div className="bmxt-tab-picker-tab-title">
          <span className="bmxt-tab-picker-tab-glyph" aria-hidden>
            {markGlyph}
          </span>
          <span aria-hidden>{indentGlyphs.join("")}</span>
          <span className="bmxt-tab-picker-tab-title-text">{view.label}</span>
        </div>
        {view.detail !== null ? (
          <div className="bmxt-tab-picker-tab-url">{view.detail}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={isHi || view.marked}
      aria-expanded={view.expanded}
      className={className}
      onMouseDown={() => onSelect(index)}>
      <span aria-hidden>{indentGlyphs.join("")}</span>
      <span className="bmxt-tab-picker-fold-glyph" aria-hidden>
        {view.expanded ? "▼" : "▶"}
      </span>
      <span className="bmxt-tab-picker-tab-glyph">{markGlyph}</span>
      <span>{view.label}</span>
    </div>
  )
}

const TreePickerRow = memo(TreePickerRowImpl)

/**
 * EN: Tab-picker-styled tree list (headers + leaves) with an action-menu overlay.
 * JA: tabs ピッカーと同じ見た目のツリー一覧（見出し＋葉）とアクションメニュー。
 */
export function TreePickerBody({
  headline,
  emptyText,
  inputAriaLabel,
  listAriaLabel,
  views,
  hi,
  onHiChange,
  filterQuery,
  onFilterQueryChange,
  menu,
  onMenuPickIndexChange,
  onMenuConfirm,
  onMenuClose,
  onOpenMenu,
  onSetFold,
  onToggleMark,
  onReturnToPrompt,
  onExitToDetailBar,
  keyboardActive,
  pickerInputRef
}: TreePickerBodyProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [rowHeight, setRowHeight] = useState<number | null>(null)
  const [windowRange, setWindowRange] = useState({ start: 0, end: 0 })

  const useVirtual = views.length >= PLAIN_PICKER_VIRTUALIZE_MIN
  const effectiveRowHeight = rowHeight ?? TREE_PICKER_ROW_HEIGHT_FALLBACK

  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )

  const { onInputKeyDown } = useTreePickerKeyboard({
    keyboardActive,
    views,
    hi,
    setHi: onHiChange,
    searchMode,
    setSearchMode,
    filterQuery,
    onFilterQueryChange,
    menuOpen: menu !== null,
    menuItemCount: menu === null ? 0 : menu.items.length,
    menuPickIndex: menu === null ? 0 : menu.pickIndex,
    onMenuPickIndexChange,
    onMenuConfirm,
    onMenuClose,
    onOpenMenu,
    onSetFold,
    onToggleMark,
    onReturnToPrompt,
    onExitToDetailBar
  })

  const syncWindowFromScroll = useCallback(() => {
    const list = listRef.current
    if (!list || !useVirtual || views.length === 0) {
      return
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        views.length,
        effectiveRowHeight
      )
    )
  }, [effectiveRowHeight, useVirtual, views.length])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus({ preventScroll: true })
    } else {
      inputRef.current?.blur()
    }
  }, [keyboardActive])

  useLayoutEffect(() => {
    if (!useVirtual) {
      return
    }
    const probe = measureRef.current
    if (probe === null) {
      return
    }
    const h = probe.getBoundingClientRect().height
    if (h > 0) {
      setRowHeight(h)
    }
  }, [useVirtual, views.length])

  useLayoutEffect(() => {
    if (!useVirtual) {
      const listEl = listRef.current
      scrollPickerListToHiAfterLayout(listEl, ROW_ID_PREFIX, hi)
      return
    }
    const list = listRef.current
    if (list === null) {
      return
    }
    const nextTop = scrollTopForPlainPickerIndex(
      list.scrollTop,
      list.clientHeight,
      hi,
      effectiveRowHeight
    )
    if (nextTop !== list.scrollTop) {
      list.scrollTop = nextTop
    }
    setWindowRange(
      computePlainPickerWindow(
        list.scrollTop,
        list.clientHeight,
        views.length,
        effectiveRowHeight
      )
    )
  }, [effectiveRowHeight, hi, useVirtual, views.length])

  useLayoutEffect(() => {
    if (!useVirtual) {
      return
    }
    syncWindowFromScroll()
  }, [syncWindowFromScroll, useVirtual, effectiveRowHeight, views.length])

  const onSelectRow = useCallback(
    (index: number) => {
      onHiChange(index)
    },
    [onHiChange]
  )

  const renderRows = (start: number, end: number): ReactNode[] => {
    const slice: ReactNode[] = []
    for (let i = start; i < end; i += 1) {
      const view = views[i]
      if (view === undefined) {
        continue
      }
      slice.push(
        <TreePickerRow
          key={view.domKey}
          view={view}
          index={i}
          isHi={i === hi}
          onSelect={onSelectRow}
        />
      )
    }
    return slice
  }

  const totalHeight = useVirtual ? views.length * effectiveRowHeight : undefined
  const virtualStart = useVirtual ? windowRange.start : 0
  const virtualEnd = useVirtual ? windowRange.end : views.length
  const listScopeId = useId()
  const virtualTrackScopeId = useId()
  const virtualWindowScopeId = useId()

  useCspDynamicStyle(
    useVirtual ? listScopeId : null,
    useVirtual ? { "--bmxt-tree-picker-row-height": `${effectiveRowHeight}px` } : null
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

  let listBody: ReactNode
  if (views.length === 0) {
    listBody = <div className="bmxt-tab-picker-empty">{emptyText}</div>
  } else if (useVirtual) {
    listBody = (
      <>
        <div
          ref={measureRef}
          className="bmxt-tab-picker-row bmxt-tab-picker-row--tab bmxt-plain-picker-measure-row"
          aria-hidden>
          <div className="bmxt-tab-picker-tab-title">
            <span className="bmxt-tab-picker-tab-glyph" aria-hidden>
              {" "}
            </span>
            <span className="bmxt-tab-picker-tab-title-text">{"\u00a0"}</span>
          </div>
          <div className="bmxt-tab-picker-tab-url">{"\u00a0"}</div>
        </div>
        <div
          className="bmxt-plain-picker-virtual-track"
          {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualTrackScopeId }}>
          <div
            className="bmxt-plain-picker-virtual-window"
            {...{ [CSP_DYNAMIC_SCOPE_ATTR]: virtualWindowScopeId }}>
            {renderRows(virtualStart, virtualEnd)}
          </div>
        </div>
      </>
    )
  } else {
    listBody = renderRows(0, views.length)
  }

  const menuPanel =
    menu === null ? null : (
      <div className="bmxt-tab-picker-group-panel bmxt-tab-picker-action-menu-panel bmxt-tab-picker-action-menu-panel--overlay">
        <div className="bmxt-tab-picker-group-head">{menu.title}</div>
        <div className="bmxt-tab-picker-action-targets">
          {menu.targetLabels.map((label, index) => (
            <div key={`${index}-${label}`} className="bmxt-tab-picker-action-target-row">
              <span className="bmxt-tab-picker-action-target-title">{label}</span>
            </div>
          ))}
        </div>
        <div className="bmxt-tab-picker-action-menu-items">
          {menu.items.map((item, index) => (
            <div
              key={item.id}
              className={`bmxt-tab-picker-group-row${
                index === menu.pickIndex ? " bmxt-tab-picker-group-row--hi" : ""
              }`}>
              {item.label}
            </div>
          ))}
        </div>
        <div className="bmxt-tab-picker-group-head">{menu.hint}</div>
      </div>
    )

  return (
    <div className="bmxt-tab-picker-action-menu-host">
      <PickerListShell
        headline={headline}
        keyboardActive={keyboardActive}
        searchMode={searchMode}
        commandMode={false}
        filterQuery={filterQuery}
        commandBuffer=""
        setInputEl={setInputEl}
        onInputKeyDown={onInputKeyDown}
        onInputChange={(value) => {
          if (searchMode) {
            onFilterQueryChange(value)
          }
        }}
        onCompositionEndSearch={searchMode ? (value) => onFilterQueryChange(value) : undefined}
        inputAriaLabel={inputAriaLabel}
        listAriaLabel={listAriaLabel}
        listAriaMultiselectable
        listActivedescendant={views.length > 0 ? `${ROW_ID_PREFIX}-${hi}` : undefined}
        listClassName={useVirtual ? "bmxt-tab-picker-list--tree-virtual" : undefined}
        listScopeId={useVirtual ? listScopeId : null}
        listRef={listRef}
        onListScroll={useVirtual ? syncWindowFromScroll : undefined}
        listBody={listBody}
        searchFooter={searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
        inputRef={inputRef}
      />
      {menuPanel}
    </div>
  )
}
