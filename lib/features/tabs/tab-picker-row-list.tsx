import type { ReactNode } from "react"
import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../side-picker/search/picker-search-needle"
import { displayTitle, type TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode } from "./tab-picker-overlay-types"

function renderHighlighted(text: string, needle: string, keyPrefix: string): ReactNode {
  return splitTextHighlightSegments(text, needle).map((seg, i) =>
    seg.match ? (
      <mark key={`${keyPrefix}-${i}`} className="bmxt-tab-picker-search-hl">
        {seg.text}
      </mark>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{seg.text}</span>
    )
  )
}

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
  /** `/` 入力中または確定後の検索語（`@` で URL 側のみハイライト） */
  searchHighlightQuery: string
  setRowRef: (rowIndex: number, el: HTMLDivElement | null) => void
  isWindowExpanded: (windowId: number) => boolean
  isGroupExpanded: (windowId: number, groupId: number | null) => boolean
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
  searchHighlightQuery,
  setRowRef,
  isWindowExpanded,
  isGroupExpanded
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
        const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
        if (row.kind === "window") {
          const markedRow = markedWindowSet.has(row.windowId)
          const expanded = isWindowExpanded(row.windowId)
          return (
            <div
              key={i}
              id={`bmxt-tab-row-${i}`}
              ref={(el) => setRowRef(i, el)}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--window${
                expanded ? "" : " bmxt-tab-picker-row--folded"
              }${hiRow ? " bmxt-tab-picker-row--hi" : ""}${
                markedRow ? " bmxt-tab-picker-row--marked" : ""
              }${moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""}`}>
              <span className="bmxt-tab-picker-fold-glyph" aria-hidden>
                {expanded ? "▼" : "▶"}
              </span>
              <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
              {byUrl ? row.label : renderHighlighted(row.label, needle, `w-${i}`)}
            </div>
          )
        }
        if (row.kind === "group") {
          const markedRow = markedGroupSet.has(groupRowKey(row.windowId, row.groupId))
          const expanded = isGroupExpanded(row.windowId, row.groupId)
          return (
            <div
              key={i}
              id={`bmxt-tab-row-${i}`}
              ref={(el) => setRowRef(i, el)}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--group${
                expanded ? "" : " bmxt-tab-picker-row--folded"
              }${hiRow ? " bmxt-tab-picker-row--hi" : ""}${
                markedRow ? " bmxt-tab-picker-row--marked" : ""
              }${moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""}`}>
              <span className="bmxt-tab-picker-fold-glyph" aria-hidden>
                {expanded ? "▼" : "▶"}
              </span>
              <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
              {byUrl ? row.label : renderHighlighted(row.label, needle, `g-${i}`)}
            </div>
          )
        }
        const markedRow = markedTabSet.has(row.tabId)
        const rowClass = `bmxt-tab-picker-row bmxt-tab-picker-row--tab${
          hiRow ? " bmxt-tab-picker-row--hi" : ""
        }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
          moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
        }`
        const titleShown = displayTitle(row.title)
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
                {(row.active || activeTabId === row.tabId) ? "*" : " "}
              </span>
              <span className="bmxt-tab-picker-tab-glyph">
                {markedTabSet.has(row.tabId) ? "#" : " "}
              </span>
              {byUrl ? titleShown : renderHighlighted(titleShown, needle, `t-${i}`)}
            </div>
            {showUrl ? (
              <div className="bmxt-tab-picker-tab-url">
                {byUrl
                  ? renderHighlighted(row.url || "(no url)", needle, `u-${i}`)
                  : row.url || "(no url)"}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
