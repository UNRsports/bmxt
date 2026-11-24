import type { ReactNode, Ref, RefObject, UIEventHandler } from "react"
import { CSP_DYNAMIC_SCOPE_ATTR } from "../../bmxt-window/csp-dynamic-stylesheet"

export type PickerListShellProps = {
  headline: string
  keyboardActive: boolean
  searchMode: boolean
  commandMode: boolean
  filterQuery: string
  commandBuffer: string
  setInputEl: (el: HTMLTextAreaElement | null) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onInputChange: (value: string) => void
  onCompositionEndSearch?: (value: string) => void
  inputAriaLabel: string
  listRole?: "listbox"
  listAriaLabel: string
  listAriaMultiselectable?: boolean
  listActivedescendant?: string
  /** EN: Optional class suffix for the scrollable list (e.g. virtualization). */
  listClassName?: string
  /** EN: Optional CSP dynamic style scope id on the list element. */
  listScopeId?: string | null
  listRef?: Ref<HTMLDivElement | null>
  onListScroll?: UIEventHandler<HTMLDivElement>
  listBody: ReactNode
  searchFooter?: ReactNode
  commandFooter?: ReactNode
  extraFooter?: ReactNode
  inputRef?: RefObject<HTMLTextAreaElement | null>
}

/** EN: Shared picker column chrome (headline, IME, list slot, footers). */
export function PickerListShell({
  headline,
  searchMode,
  commandMode,
  filterQuery,
  commandBuffer,
  setInputEl,
  onInputKeyDown,
  onInputChange,
  onCompositionEndSearch,
  inputAriaLabel,
  listRole = "listbox",
  listAriaLabel,
  listAriaMultiselectable,
  listActivedescendant,
  listClassName,
  listScopeId,
  listRef,
  onListScroll,
  listBody,
  searchFooter,
  commandFooter,
  extraFooter
}: PickerListShellProps) {
  const listClass =
    "bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable" +
    (listClassName !== undefined && listClassName.length > 0 ? ` ${listClassName}` : "")
  return (
    <div className="bmxt-tab-picker bmxt-side-picker">
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
        aria-label={inputAriaLabel}
        value={searchMode ? filterQuery : commandMode ? commandBuffer : ""}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={
          onCompositionEndSearch
            ? (e) => onCompositionEndSearch(e.currentTarget.value)
            : undefined
        }
      />
      <div
        ref={listRef}
        className={listClass}
        role={listRole}
        aria-label={listAriaLabel}
        aria-multiselectable={listAriaMultiselectable}
        aria-activedescendant={listActivedescendant}
        onScroll={onListScroll}
        {...(listScopeId != null && listScopeId.length > 0
          ? { [CSP_DYNAMIC_SCOPE_ATTR]: listScopeId }
          : {})}>
        {listBody}
      </div>
      {extraFooter}
      {searchFooter}
      {commandFooter}
    </div>
  )
}
