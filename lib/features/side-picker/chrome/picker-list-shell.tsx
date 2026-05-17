import type { ReactNode, RefObject } from "react"

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
  listBody: ReactNode
  searchFooter?: ReactNode
  commandFooter?: ReactNode
  extraFooter?: ReactNode
  inputRef?: RefObject<HTMLTextAreaElement | null>
  onShellMouseDown?: (ev: React.MouseEvent) => void
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
  listBody,
  searchFooter,
  commandFooter,
  extraFooter,
  onShellMouseDown
}: PickerListShellProps) {
  return (
    <div
      className="bmxt-tab-picker bmxt-side-picker"
      onMouseDown={onShellMouseDown}>
      <div className="bmxt-tab-picker-head">{headline}</div>
      <textarea
        ref={setInputEl}
        className="bmxt-tab-picker-filter-ime"
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
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role={listRole}
        aria-label={listAriaLabel}
        aria-multiselectable={listAriaMultiselectable}
        aria-activedescendant={listActivedescendant}>
        {listBody}
      </div>
      {extraFooter}
      {searchFooter}
      {commandFooter}
    </div>
  )
}
