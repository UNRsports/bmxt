import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { SearchListPickerState } from "../../search/search-list-picker-input"
import type { SettingListPickerState } from "../../setting/setting-list-picker-state"
import type { BookmarkPickerState } from "../../bookmark/bookmark-picker-state"
import type { HistoryPickerState } from "../../history/history-picker-state"
import type { TabPickerState } from "./tab-picker-state"

export type PickerSlotId = "tabs" | "search" | "dom" | "setting" | "bookmark" | "history"

export type SessionPickerState = {
  tabs: TabPickerState | null
  search: SearchListPickerState | null
  dom: DomListPickerState | null
  setting: SettingListPickerState | null
  bookmark: BookmarkPickerState | null
  history: HistoryPickerState | null
}

export const EMPTY_SESSION_PICKERS: SessionPickerState = {
  tabs: null,
  search: null,
  dom: null,
  setting: null,
  bookmark: null,
  history: null
}

export type SessionPickersByLeaf = Record<string, SessionPickerState>

export function sessionPickersOrEmpty(
  map: SessionPickersByLeaf,
  sessionId: string
): SessionPickerState {
  return map[sessionId] ?? EMPTY_SESSION_PICKERS
}

export function anySessionPickerOpen(pickers: SessionPickerState): boolean {
  return (
    pickers.tabs !== null ||
    pickers.search !== null ||
    pickers.dom !== null ||
    pickers.setting !== null ||
    pickers.bookmark !== null ||
    pickers.history !== null
  )
}

export function anyLeafHasPickerOpen(map: SessionPickersByLeaf): boolean {
  return Object.values(map).some(anySessionPickerOpen)
}

export function anyLeafHasTabPickerOpen(map: SessionPickersByLeaf): boolean {
  return Object.values(map).some((pickers) => pickers.tabs !== null)
}

export function openPickerSlots(pickers: SessionPickerState): PickerSlotId[] {
  const open: PickerSlotId[] = []
  if (pickers.tabs !== null) {
    open.push("tabs")
  }
  if (pickers.search !== null) {
    open.push("search")
  }
  if (pickers.dom !== null) {
    open.push("dom")
  }
  if (pickers.setting !== null) {
    open.push("setting")
  }
  if (pickers.bookmark !== null) {
    open.push("bookmark")
  }
  if (pickers.history !== null) {
    open.push("history")
  }
  return open
}

export function pruneSessionPickersMap(
  prev: SessionPickersByLeaf,
  validLeafIds: readonly string[]
): SessionPickersByLeaf {
  let changed = false
  const next: SessionPickersByLeaf = { ...prev }
  for (const k of Object.keys(next)) {
    if (!validLeafIds.includes(k)) {
      delete next[k]
      changed = true
    }
  }
  return changed ? next : prev
}

export function setSessionPickerSlot<K extends PickerSlotId>(
  prev: SessionPickersByLeaf,
  sessionId: string,
  slot: K,
  value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
): SessionPickersByLeaf {
  const cur = sessionPickersOrEmpty(prev, sessionId)
  const nextValue = typeof value === "function" ? (value as Function)(cur[slot]) : value
  if (nextValue === null) {
    if (cur[slot] === null && !(sessionId in prev)) {
      return prev
    }
    const nextSlot = { ...cur, [slot]: null }
    const allClosed =
      nextSlot.tabs === null &&
      nextSlot.search === null &&
      nextSlot.dom === null &&
      nextSlot.setting === null &&
      nextSlot.bookmark === null &&
      nextSlot.history === null
    if (allClosed) {
      if (!(sessionId in prev)) {
        return prev
      }
      const { [sessionId]: _, ...rest } = prev
      return rest
    }
    return { ...prev, [sessionId]: nextSlot }
  }
  return { ...prev, [sessionId]: { ...cur, [slot]: nextValue } }
}
