import { useLayoutEffect, useRef, type MutableRefObject } from "react"
import type { PickerSlotId } from "../session/session-pickers"

/** EN: Must match `.bmxt-picker-column-slot` transform transition in bmxt-ui.css. */
export const PICKER_COLUMN_FLIP_MS = 280

function sameSlotSet(a: readonly PickerSlotId[], b: readonly PickerSlotId[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const set = new Set(a)
  return b.every((slot) => set.has(slot))
}

function ordersEqual(a: readonly PickerSlotId[], b: readonly PickerSlotId[]): boolean {
  return a.length === b.length && a.every((slot, index) => slot === b[index])
}

function resetSlotTransforms(slotEls: ReadonlyMap<PickerSlotId, HTMLDivElement>): void {
  for (const el of slotEls.values()) {
    el.style.transition = ""
    el.style.transform = ""
  }
}

function measureColumnSpanPx(
  order: readonly PickerSlotId[],
  slotEls: ReadonlyMap<PickerSlotId, HTMLDivElement>
): number {
  if (order.length === 0) {
    return 0
  }
  const first = slotEls.get(order[0]!)
  if (!first) {
    return 0
  }
  return first.getBoundingClientRect().width
}

function computeIndexFlipDeltaX(
  prevOrder: readonly PickerSlotId[],
  nextOrder: readonly PickerSlotId[],
  slot: PickerSlotId,
  columnSpanPx: number
): number {
  const fromIndex = prevOrder.indexOf(slot)
  const toIndex = nextOrder.indexOf(slot)
  if (fromIndex < 0 || toIndex < 0 || columnSpanPx <= 0) {
    return 0
  }
  return columnSpanPx * (fromIndex - toIndex)
}

/** EN: FLIP slide when `columnOrder` reorders open picker columns (same slots, new order). */
export function usePickerColumnFlip(
  columnOrder: readonly PickerSlotId[],
  slotElsRef: MutableRefObject<Map<PickerSlotId, HTMLDivElement>>
): void {
  const prevOrderRef = useRef<readonly PickerSlotId[]>([])
  const playbackRafRef = useRef<number | null>(null)
  const settleTimerRef = useRef<number | null>(null)
  const animatingRef = useRef(false)

  useLayoutEffect(() => {
    const cancelPlayback = (): void => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current)
        playbackRafRef.current = null
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
    }

    const scheduleSettle = (): void => {
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null
        animatingRef.current = false
        resetSlotTransforms(slotElsRef.current)
      }, PICKER_COLUMN_FLIP_MS)
    }

    const prevOrder = prevOrderRef.current
    const slotEls = slotElsRef.current
    const reorderPending =
      prevOrder.length > 0 &&
      !ordersEqual(prevOrder, columnOrder) &&
      sameSlotSet(prevOrder, columnOrder)

    cancelPlayback()
    resetSlotTransforms(slotEls)

    if (reorderPending) {
      const columnSpanPx = measureColumnSpanPx(columnOrder, slotEls)
      animatingRef.current = true

      for (const slot of columnOrder) {
        const el = slotEls.get(slot)
        if (!el) {
          continue
        }
        const deltaX = computeIndexFlipDeltaX(prevOrder, columnOrder, slot, columnSpanPx)
        if (deltaX === 0) {
          continue
        }
        el.style.transition = "none"
        el.style.transform = `translateX(${deltaX}px)`
      }

      playbackRafRef.current = requestAnimationFrame(() => {
        playbackRafRef.current = requestAnimationFrame(() => {
          playbackRafRef.current = null
          for (const slot of columnOrder) {
            const el = slotEls.get(slot)
            if (!el) {
              continue
            }
            el.style.transition = ""
            el.style.transform = ""
          }
          scheduleSettle()
        })
      })
    }

    prevOrderRef.current = columnOrder

    return () => {
      cancelPlayback()
    }
  }, [columnOrder, slotElsRef])
}
