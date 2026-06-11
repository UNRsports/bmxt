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

function buildPickerColumnBaseOrder(
  open: readonly PickerSlotId[],
  persistedOrder: readonly PickerSlotId[]
): PickerSlotId[] {
  const openSet = new Set(open)
  const base: PickerSlotId[] = []
  for (const slot of persistedOrder) {
    if (openSet.has(slot)) {
      base.push(slot)
    }
  }
  for (const slot of open) {
    if (!base.includes(slot)) {
      base.push(slot)
    }
  }
  return base
}

/**
 * EN: Resolve picker column order. `highlightSlot` moves left; when null, keep
 * `persistedOrder` (non-picker detail bars do not reset column positions).
 */
export function resolvePickerColumnOrder(
  open: readonly PickerSlotId[],
  highlightSlot: PickerSlotId | null,
  persistedOrder: readonly PickerSlotId[]
): PickerSlotId[] {
  const base = buildPickerColumnBaseOrder(open, persistedOrder)
  if (base.length === 0) {
    return []
  }
  if (highlightSlot === null || !open.includes(highlightSlot)) {
    return base
  }
  return [highlightSlot, ...base.filter((slot) => slot !== highlightSlot)]
}

/** EN: Leftmost-first column order; `focusedSlot` moves to index 0 when set. */
export function computePickerColumnOrder(
  open: readonly PickerSlotId[],
  focusedSlot: PickerSlotId | null
): PickerSlotId[] {
  return resolvePickerColumnOrder(open, focusedSlot, open)
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
