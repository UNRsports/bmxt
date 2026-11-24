import { useCallback, useLayoutEffect, useRef, useState } from "react"
import type { MutableRefObject, SetStateAction } from "react"
import { PickerListShell } from "../chrome/picker-list-shell"
import { PickerSearchFooter } from "../chrome/picker-search-footer"
import { scrollPickerListToHiAfterLayout } from "../interaction/picker-list-scroll"
import { useTreePickerKeyboard } from "./use-tree-picker-keyboard"
import type { TreePickerActionMenu, TreePickerRowView } from "./tree-picker-types"

const ROW_ID_PREFIX = "bmxt-tree-row"

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

function TreePickerRow({
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
  const listWrapRef = useRef<HTMLDivElement | null>(null)
  const [searchMode, setSearchMode] = useState(false)

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

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus({ preventScroll: true })
    } else {
      inputRef.current?.blur()
    }
  }, [keyboardActive])

  useLayoutEffect(() => {
    const host = listWrapRef.current
    if (host === null) {
      return
    }
    const listEl = host.querySelector<HTMLElement>(".bmxt-tab-picker-list")
    scrollPickerListToHiAfterLayout(listEl, ROW_ID_PREFIX, hi)
  }, [hi, views.length])

  const onSelectRow = useCallback(
    (index: number) => {
      onHiChange(index)
    },
    [onHiChange]
  )

  const listBody =
    views.length === 0 ? (
      <div className="bmxt-tab-picker-empty">{emptyText}</div>
    ) : (
      views.map((view, index) => (
        <TreePickerRow
          key={view.domKey}
          view={view}
          index={index}
          isHi={index === hi}
          onSelect={onSelectRow}
        />
      ))
    )

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
    <div ref={listWrapRef} className="bmxt-tab-picker-action-menu-host">
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
        listBody={listBody}
        searchFooter={searchMode ? <PickerSearchFooter filterQuery={filterQuery} /> : null}
        inputRef={inputRef}
      />
      {menuPanel}
    </div>
  )
}
