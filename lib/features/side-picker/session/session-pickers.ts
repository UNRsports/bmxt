import type { DomListPickerState } from "../../dom/dom-list-picker-input"
import type { FindListPickerState } from "../../find/find-list-picker-input"
import type { TranslatePickerState } from "../../translate/translate-picker-state"
import type { TabPickerState } from "./tab-picker-state"

export type PickerSlotId = "tabs" | "find" | "dom" | "translate"

export type SessionPickerState = {
  tabs: TabPickerState | null
  find: FindListPickerState | null
  dom: DomListPickerState | null
  translate: TranslatePickerState | null
}

export const EMPTY_SESSION_PICKERS: SessionPickerState = {
  tabs: null,
  find: null,
  dom: null,
  translate: null
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
    pickers.find !== null ||
    pickers.dom !== null ||
    pickers.translate !== null
  )
}

export function anyLeafHasPickerOpen(map: SessionPickersByLeaf): boolean {
  return Object.values(map).some(anySessionPickerOpen)
}

export function openPickerSlots(pickers: SessionPickerState): PickerSlotId[] {
  const open: PickerSlotId[] = []
  if (pickers.tabs !== null) {
    open.push("tabs")
  }
  if (pickers.find !== null) {
    open.push("find")
  }
  if (pickers.dom !== null) {
    open.push("dom")
  }
  if (pickers.translate !== null) {
    open.push("translate")
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
  value: SessionPickerState[K]
): SessionPickersByLeaf {
  const cur = sessionPickersOrEmpty(prev, sessionId)
  if (value === null) {
    if (cur[slot] === null && !(sessionId in prev)) {
      return prev
    }
    const nextSlot = { ...cur, [slot]: null }
    const allClosed =
      nextSlot.tabs === null &&
      nextSlot.find === null &&
      nextSlot.dom === null &&
      nextSlot.translate === null
    if (allClosed) {
      if (!(sessionId in prev)) {
        return prev
      }
      const { [sessionId]: _, ...rest } = prev
      return rest
    }
    return { ...prev, [sessionId]: nextSlot }
  }
  return { ...prev, [sessionId]: { ...cur, [slot]: value } }
}
