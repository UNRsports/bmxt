import type { ReactNode } from "react"
import type { SearchOpenDestinationRow } from "./search-open-destination"

const ROW_ID_PREFIX = "bmxt-search-row"

type Props = {
  index: number
  row: SearchOpenDestinationRow
  hi: number
}

/** EN: One row in the search picker open-destination tree. */
export function SearchOpenDestinationPickerRow({ index, row, hi }: Props): ReactNode {
  const hiRow = index === hi
  let rowClass = "bmxt-tab-picker-row"
  if (row.kind === "new_window" || row.kind === "window") {
    rowClass += " bmxt-tab-picker-row--window"
  } else {
    rowClass += " bmxt-tab-picker-row--group"
  }
  if (hiRow) {
    rowClass += " bmxt-tab-picker-row--hi"
  }

  return (
    <div
      id={`${ROW_ID_PREFIX}-${index}`}
      role="option"
      aria-selected={hiRow}
      className={rowClass}>
      <span className="bmxt-plain-picker-row-text">{row.label}</span>
    </div>
  )
}
