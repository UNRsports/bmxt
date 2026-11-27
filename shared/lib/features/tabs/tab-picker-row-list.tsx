import type { ReactNode } from "react"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  parsePickerSearchNeedle,
  splitTextHighlightSegments
} from "../side-picker/search/picker-search-needle"
import { displayTitle, type TabPickerRow } from "./picker-rows"
import { resolveLiveTabFaviconSrc } from "./tab-picker-live-display"
import { resolveLiveTabTitle, resolveLiveTabUrl } from "./tab-picker-live-tab-fields"
import { formatWindowPickerLabel } from "./tab-picker-window-label"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode, SelectKind } from "./tab-picker-overlay-types"
import {
  moveInsertMarkerAt,
  resolveMoveInsertSlot,
  type MoveInsertSlot
} from "./resolve-move-insert-slot"
import { isMoveHeaderDestMode } from "./move-dest-navigable"
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

function InsertSlotMarker({ active }: { active: boolean }) {
  if (!active) {
    return null
  }
  return (
    <div
      className="bmxt-tab-picker-insert-slot"
      role="presentation"
      aria-hidden
    />
  )
}

export function TabPickerTabFavicon({ src }: { src: string }) {
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
  markedKind: SelectKind | null
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
  markedKind,
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
  const { settings: uiSettings } = useUiSettings()
  useTabPickerLiveFieldsRevision()

  const headerDestMode = isMoveHeaderDestMode(markedKind)
  const insertSlot: MoveInsertSlot | null =
    bulkSubMode === "move"
      ? resolveMoveInsertSlot(rows, visibleRowIndices, moveDestHi, {
          headerDestMode
        })
      : null
  const destGroupId =
    bulkSubMode === "move" && headerDestMode && insertSlot !== null && insertSlot.groupId !== null
      ? insertSlot.groupId
      : null
  const destWindowIdForGroup =
    bulkSubMode === "move" && headerDestMode && insertSlot !== null && insertSlot.groupId !== null
      ? insertSlot.windowId
      : null

  if (rows.length === 0) {
    return <div className="bmxt-tab-picker-empty">{tTabs("tabs.picker.empty", uiSettings.locale)}</div>
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
        const moveCursorRow =
          bulkSubMode === "move" && visIndex >= 0 && visibleRowIndices[moveDestHi] === i
        const showInsertSlots = bulkSubMode === "move" && !headerDestMode
        const slotBefore = showInsertSlots && moveInsertMarkerAt(insertSlot, i, "before")
        const slotAfter = showInsertSlots && moveInsertMarkerAt(insertSlot, i, "after")
        const moveDestBand =
          destGroupId !== null &&
          destWindowIdForGroup !== null &&
          ((row.kind === "group" &&
            row.windowId === destWindowIdForGroup &&
            row.groupId === destGroupId) ||
            (row.kind === "tab" &&
              row.windowId === destWindowIdForGroup &&
              row.groupId === destGroupId))
        const { byUrl, needle } = parsePickerSearchNeedle(searchHighlightQuery)
        if (row.kind === "window") {
          const markedRow = markedWindowSet.has(row.windowId)
          const expanded = isWindowExpanded(row.windowId)
          const windowLabel = formatWindowPickerLabel(
            row,
            rows,
            trackedWindowId,
            trackedWindowTitle,
            uiSettings.locale
          )
          return (
            <div key={i} className="bmxt-tab-picker-row-block">
              <InsertSlotMarker active={Boolean(slotBefore)} />
              <div
                id={`bmxt-tab-row-${i}`}
                ref={(el) => setRowRef(i, el)}
                className={`bmxt-tab-picker-row bmxt-tab-picker-row--window${
                  expanded ? "" : " bmxt-tab-picker-row--folded"
                }${hiRow ? " bmxt-tab-picker-row--hi" : ""}${
                  markedRow ? " bmxt-tab-picker-row--marked" : ""
                }${moveCursorRow ? " bmxt-tab-picker-row--move-cursor" : ""}`}>
                <span className="bmxt-tab-picker-fold-glyph" aria-hidden>
                  {expanded ? "▼" : "▶"}
                </span>
                <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
                {byUrl ? windowLabel : renderHighlighted(windowLabel, needle, `w-${i}`)}
              </div>
              <InsertSlotMarker active={Boolean(slotAfter)} />
            </div>
          )
        }
        if (row.kind === "group") {
          const markedRow = markedGroupSet.has(groupRowKey(row.windowId, row.groupId))
          const expanded = isGroupExpanded(row.windowId, row.groupId)
          const groupLabelClass = `bmxt-tab-picker-group-label bmxt-tab-picker-group-accent--${row.color}`
          return (
            <div key={i} className="bmxt-tab-picker-row-block">
              <InsertSlotMarker active={Boolean(slotBefore)} />
              <div
                id={`bmxt-tab-row-${i}`}
                ref={(el) => setRowRef(i, el)}
                className={`bmxt-tab-picker-row bmxt-tab-picker-row--group${
                  expanded ? "" : " bmxt-tab-picker-row--folded"
                }${hiRow ? " bmxt-tab-picker-row--hi" : ""}${
                  markedRow ? " bmxt-tab-picker-row--marked" : ""
                }${moveCursorRow ? " bmxt-tab-picker-row--move-cursor" : ""}${
                  moveDestBand ? " bmxt-tab-picker-row--move-dest-band" : ""
                }`}>
                <span className="bmxt-tab-picker-fold-glyph" aria-hidden>
                  {expanded ? "▼" : "▶"}
                </span>
                <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
                <span className={groupLabelClass}>
                  {byUrl ? row.label : renderHighlighted(row.label, needle, `g-${i}`)}
                </span>
              </div>
              <InsertSlotMarker active={Boolean(slotAfter)} />
            </div>
          )
        }
        const markedByTab = markedTabSet.has(row.tabId)
        const markedByGroup =
          row.groupId !== null &&
          markedGroupSet.has(groupRowKey(row.windowId, row.groupId))
        const markedHighlight = markedByTab || markedByGroup
        const rowClass = `bmxt-tab-picker-row bmxt-tab-picker-row--tab${
          row.groupColor ? " bmxt-tab-picker-row--tab-in-group" : ""
        }${hiRow ? " bmxt-tab-picker-row--hi" : ""}${
          markedHighlight ? " bmxt-tab-picker-row--marked" : ""
        }${moveCursorRow ? " bmxt-tab-picker-row--move-cursor" : ""}${
          moveDestBand ? " bmxt-tab-picker-row--move-dest-band" : ""
        }`
        const liveTitle = resolveLiveTabTitle(row.tabId, row.title)
        const liveUrl = resolveLiveTabUrl(row.tabId, row.url)
        const titleShown = displayTitle(liveTitle)
        const faviconSrc = resolveLiveTabFaviconSrc(row.tabId, row.faviconSrc, liveUrl)
        const activeMarker = activeTabId === row.tabId
        return (
          <div key={`tab-${row.tabId}`} className="bmxt-tab-picker-row-block">
            <InsertSlotMarker active={Boolean(slotBefore)} />
            <div
              id={`bmxt-tab-row-${i}`}
              ref={(el) => setRowRef(i, el)}
              className={rowClass}
              role="option"
              aria-selected={hiRow || markedHighlight}>
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
                    markedByTab ? " bmxt-tab-picker-tab-glyph--mark-on" : ""
                  }`}
                  aria-hidden>
                  #
                </span>
                {row.groupColor ? (
                  <span
                    className={`bmxt-tab-picker-group-line bmxt-tab-picker-group-accent--${row.groupColor}`}
                    aria-hidden
                  />
                ) : null}
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
            <InsertSlotMarker active={Boolean(slotAfter)} />
          </div>
        )
      })}
    </>
  )
}
