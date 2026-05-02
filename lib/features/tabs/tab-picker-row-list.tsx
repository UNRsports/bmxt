import { displayTitle, type TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode } from "./tab-picker-overlay-types"

export type TabPickerRowListProps = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  /** `visibleRowIndices` 内のインデックス（ハイライト） */
  hi: number
  moveDestHi: number
  bulkSubMode: BulkSubMode | null
  markedWindowSet: Set<number>
  markedGroupSet: Set<string>
  markedTabSet: Set<number>
  activeTabId: number | null
  showUrl: boolean
  setRowRef: (rowIndex: number, el: HTMLDivElement | null) => void
}

export function TabPickerRowList({
  rows,
  visibleRowIndices,
  hi,
  moveDestHi,
  bulkSubMode,
  markedWindowSet,
  markedGroupSet,
  markedTabSet,
  activeTabId,
  showUrl,
  setRowRef
}: TabPickerRowListProps) {
  if (rows.length === 0) {
    return <div className="bmxt-tab-picker-empty">(タブなし)</div>
  }

  return (
    <>
      {rows.map((row, i) => {
        const hidden = visibleRowIndices.indexOf(i) < 0
        if (hidden) {
          return null
        }
        const visIndex = visibleRowIndices.indexOf(i)
        const hiRow = visibleRowIndices[hi] === i
        const moveDestRow =
          bulkSubMode === "move" &&
          visIndex >= 0 &&
          visibleRowIndices[moveDestHi] === i
        if (row.kind === "window") {
          const markedRow = markedWindowSet.has(row.windowId)
          return (
            <div
              key={i}
              id={`bmxt-tab-row-${i}`}
              ref={(el) => setRowRef(i, el)}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--window${
                hiRow ? " bmxt-tab-picker-row--hi" : ""
              }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
                moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
              }`}>
              <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
              {row.label}
            </div>
          )
        }
        if (row.kind === "group") {
          const markedRow = markedGroupSet.has(groupRowKey(row.windowId, row.groupId))
          return (
            <div
              key={i}
              id={`bmxt-tab-row-${i}`}
              ref={(el) => setRowRef(i, el)}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--group${
                hiRow ? " bmxt-tab-picker-row--hi" : ""
              }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
                moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
              }`}>
              <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
              {row.label}
            </div>
          )
        }
        const markedRow = markedTabSet.has(row.tabId)
        const rowClass = `bmxt-tab-picker-row bmxt-tab-picker-row--tab${
          hiRow ? " bmxt-tab-picker-row--hi" : ""
        }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
          moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
        }`
        return (
          <div
            key={i}
            id={`bmxt-tab-row-${i}`}
            ref={(el) => setRowRef(i, el)}
            className={rowClass}
            role="option"
            aria-selected={hiRow || markedRow}>
            <div className="bmxt-tab-picker-tab-title">
              <span className="bmxt-tab-picker-tab-glyph">
                {(activeTabId !== null ? activeTabId === row.tabId : row.active) ? "*" : " "}
              </span>
              <span className="bmxt-tab-picker-tab-glyph">
                {markedTabSet.has(row.tabId) ? "#" : " "}
              </span>
              {displayTitle(row.title)}
            </div>
            {showUrl ? (
              <div className="bmxt-tab-picker-tab-url">{row.url || "(no url)"}</div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
