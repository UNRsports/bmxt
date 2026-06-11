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

function snapshotSlotRects(
  order: readonly PickerSlotId[],
  slotEls: ReadonlyMap<PickerSlotId, HTMLDivElement>,
  into: Map<PickerSlotId, DOMRect>
): void {
  into.clear()
  for (const slot of order) {
    const el = slotEls.get(slot)
    if (el) {
      into.set(slot, el.getBoundingClientRect())
    }
  }
}

function resetSlotTransforms(slotEls: ReadonlyMap<PickerSlotId, HTMLDivElement>): void {
  for (const el of slotEls.values()) {
    el.style.transition = ""
    el.style.transform = ""
  }
}

/** EN: FLIP slide when `columnOrder` reorders open picker columns (same slots, new order). */
export function usePickerColumnFlip(
  columnOrder: readonly PickerSlotId[],
  slotElsRef: MutableRefObject<Map<PickerSlotId, HTMLDivElement>>
): void {
  const prevOrderRef = useRef<readonly PickerSlotId[]>([])
  const prevRectsRef = useRef(new Map<PickerSlotId, DOMRect>())
  const playbackRafRef = useRef<number | null>(null)
  const snapshotTimerRef = useRef<number | null>(null)
  const animatingRef = useRef(false)

  useLayoutEffect(() => {
    const cancelPlayback = (): void => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current)
        playbackRafRef.current = null
      }
      if (snapshotTimerRef.current !== null) {
        window.clearTimeout(snapshotTimerRef.current)
        snapshotTimerRef.current = null
      }
    }

    const scheduleRectSnapshot = (): void => {
      snapshotTimerRef.current = window.setTimeout(() => {
        snapshotTimerRef.current = null
        animatingRef.current = false
        resetSlotTransforms(slotElsRef.current)
        snapshotSlotRects(columnOrder, slotElsRef.current, prevRectsRef.current)
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

    if (reorderPending && animatingRef.current) {
      snapshotSlotRects(columnOrder, slotEls, prevRectsRef.current)
      animatingRef.current = false
      prevOrderRef.current = columnOrder
      return
    }

    const shouldFlip = reorderPending

    if (shouldFlip) {
      animatingRef.current = true
      for (const slot of columnOrder) {
        const el = slotEls.get(slot)
        const first = prevRectsRef.current.get(slot)
        if (!el || !first) {
          continue
        }
        const last = el.getBoundingClientRect()
        const deltaX = first.left - last.left
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
          scheduleRectSnapshot()
        })
      })
    } else {
      snapshotSlotRects(columnOrder, slotEls, prevRectsRef.current)
    }

    prevOrderRef.current = columnOrder

    return () => {
      cancelPlayback()
    }
  }, [columnOrder, slotElsRef])
}
