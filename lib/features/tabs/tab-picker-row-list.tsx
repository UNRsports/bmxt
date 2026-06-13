import type { ReactNode } from "react"
import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../side-picker/search/picker-search-needle"
import { displayTitle, type TabPickerRow } from "./picker-rows"
import { resolveLiveTabFaviconSrc } from "./tab-picker-live-display"
import { resolveLiveTabTitle, resolveLiveTabUrl } from "./tab-picker-live-tab-fields"
import { formatWindowPickerLabel } from "./tab-picker-window-label"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode } from "./tab-picker-overlay-types"
import { useTabPickerLiveFieldsRevision } from "./use-tab-picker-live-fields-revision"

function renderHighlighted(text: string, needle: string, keyPrefix: string): ReactNode {
  let offset = 0
  return splitTextHighlightSegments(text, needle).map((seg) => {
    const key = `${keyPrefix}-${offset}`
    offset += seg.text.length
    return seg.match ? (
      <mark key={key} className="bmxt-tab-picker-search-hl">
        {seg.text}
      </mark>
    ) : (
      <span key={key}>{seg.text}</span>
    )
  })
}

function TabPickerTabFavicon({ src }: { src: string }) {
  return (
    <img
      className="bmxt-tab-picker-tab-favicon"
      src={src}
      alt=""
      width={16}
      height={16}
      decoding="async"
      draggable={false}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden"
      }}
    />
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
  trackedWindowId: number | undefined
  trackedWindowTitle: string | null
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
  trackedWindowId,
  trackedWindowTitle,
  showUrl,
  searchHighlightQuery,
  setRowRef,
  isWindowExpanded,
  isGroupExpanded
}: TabPickerRowListProps) {
  useTabPickerLiveFieldsRevision()

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
          const windowLabel = formatWindowPickerLabel(
            row,
            rows,
            trackedWindowId,
            trackedWindowTitle
          )
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
              {byUrl ? windowLabel : renderHighlighted(windowLabel, needle, `w-${i}`)}
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
        const liveTitle = resolveLiveTabTitle(row.tabId, row.title)
        const liveUrl = resolveLiveTabUrl(row.tabId, row.url)
        const titleShown = displayTitle(liveTitle)
        const faviconSrc = resolveLiveTabFaviconSrc(row.tabId, row.faviconSrc, liveUrl)
        const activeMarker = activeTabId === row.tabId
        const markedTab = markedTabSet.has(row.tabId)
        return (
          <div
            key={`tab-${row.tabId}`}
            id={`bmxt-tab-row-${i}`}
            ref={(el) => setRowRef(i, el)}
            className={rowClass}
            role="option"
            aria-selected={hiRow || markedRow}>
            <div className="bmxt-tab-picker-tab-title">
              <span
                className={`bmxt-tab-picker-tab-glyph bmxt-tab-picker-tab-glyph--active${
                  activeMarker ? " bmxt-tab-picker-tab-glyph--active-on" : ""
                }`}
                aria-hidden>
                *
              </span>
              <span
                className={`bmxt-tab-picker-tab-glyph bmxt-tab-picker-tab-glyph--mark${
                  markedTab ? " bmxt-tab-picker-tab-glyph--mark-on" : ""
                }`}
                aria-hidden>
                #
              </span>
              {faviconSrc ? <TabPickerTabFavicon src={faviconSrc} /> : null}
              <span className="bmxt-tab-picker-tab-title-text">
                {byUrl ? titleShown : renderHighlighted(titleShown, needle, `t-${i}`)}
              </span>
            </div>
            {showUrl ? (
              <div className="bmxt-tab-picker-tab-url">
                {byUrl
                  ? renderHighlighted(liveUrl || "(no url)", needle, `u-${i}`)
                  : liveUrl || "(no url)"}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
