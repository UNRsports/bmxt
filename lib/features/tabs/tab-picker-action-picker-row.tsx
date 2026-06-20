import type { ReactNode } from "react"

const ROW_ID_PREFIX = "bmxt-tab-action-row"

type Props = {
  index: number
  label: string
  hi: number
}

/** EN: One row in the tab picker action submenu (→ from list). */
export function TabPickerActionPickerRow({ index, label, hi }: Props): ReactNode {
  const hiRow = index === hi
  let rowClass = "bmxt-tab-picker-row bmxt-tab-picker-row--group"
  if (hiRow) {
    rowClass += " bmxt-tab-picker-row--hi"
  }

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={rowClass}>
      <span className="bmxt-plain-picker-row-text">{label}</span>
    </div>
  )
}

export { ROW_ID_PREFIX as TAB_PICKER_ACTION_ROW_ID_PREFIX }
