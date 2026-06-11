import type { PickerSlotId } from "../side-picker/session/session-pickers"
import type { ModeToolbarId } from "./mode-toolbar-order"

/** EN: Detail bar slot id (mode toolbar entry shown under the prompt). */
export type DetailBarId = ModeToolbarId

export const PICKER_DETAIL_BAR_IDS = ["tabs", "search", "dom", "setting"] as const

export type PickerDetailBarId = (typeof PICKER_DETAIL_BAR_IDS)[number]

export function isPickerDetailBar(id: DetailBarId): id is PickerDetailBarId {
  return (PICKER_DETAIL_BAR_IDS as readonly string[]).includes(id)
}

export function detailBarToPickerSlot(id: PickerDetailBarId): PickerSlotId {
  return id
}

export function pickerSlotToDetailBar(slot: PickerSlotId): PickerDetailBarId {
  return slot
}

/** EN: Leftmost-first column order; `focusedSlot` moves to index 0 when set. */
export function computePickerColumnOrder(
  open: readonly PickerSlotId[],
  focusedSlot: PickerSlotId | null
): PickerSlotId[] {
  if (open.length === 0) {
    return []
  }
  if (focusedSlot === null || !open.includes(focusedSlot)) {
    return [...open]
  }
  return [focusedSlot, ...open.filter((slot) => slot !== focusedSlot)]
}

export function listVisibleDetailBars(
  order: readonly DetailBarId[],
  isVisible: (id: DetailBarId) => boolean
): DetailBarId[] {
  return order.filter(isVisible)
}

export function cycleDetailBarId(
  bars: readonly DetailBarId[],
  current: DetailBarId | null,
  direction: "up" | "down"
): DetailBarId | null {
  if (bars.length === 0) {
    return null
  }
  if (current === null) {
    return direction === "down" ? bars[0]! : bars[bars.length - 1]!
  }
  const index = bars.indexOf(current)
  if (index < 0) {
    return bars[0]!
  }
  const delta = direction === "down" ? 1 : -1
  const next = (index + delta + bars.length) % bars.length
  return bars[next]!
}

/** EN: Restore detail-bar highlight when Alt returns from the prompt (stored id wins). */
export function resolveDetailBarFocusTarget(
  visibleBars: readonly DetailBarId[],
  storedId: DetailBarId | null
): DetailBarId | null {
  if (visibleBars.length === 0) {
    return null
  }
  if (storedId !== null && visibleBars.includes(storedId)) {
    return storedId
  }
  return visibleBars[0]!
}
