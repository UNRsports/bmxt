import { Fragment, useRef } from "react"
import type { PickerSlotId } from "../session/session-pickers"
import type { SessionPickerColumnsProps } from "./picker-slot-registry"
import { renderPickerSlot } from "./picker-slot-registry"
import { usePickerColumnFlip } from "./use-picker-column-flip"

export type { SessionPickerColumnsProps } from "./picker-slot-registry"

type Props = SessionPickerColumnsProps & {
  columnOrder: readonly PickerSlotId[]
  pulseSlot: PickerSlotId | null
}

/** EN: Layer ②+③ — open picker columns for one session leaf (registry). */
export function SessionPickerColumns({ columnOrder, pulseSlot, ...props }: Props) {
  const slotElsRef = useRef(new Map<PickerSlotId, HTMLDivElement>())
  usePickerColumnFlip(columnOrder, slotElsRef)

  return (
    <>
      {columnOrder.map((slot) => {
        const columnFocused = props.isFocusedPane && props.paneFocus === slot
        return (
          <Fragment key={slot}>
            <div
              ref={(el) => {
                if (el) {
                  slotElsRef.current.set(slot, el)
                } else {
                  slotElsRef.current.delete(slot)
                }
              }}
              className={`bmxt-picker-column-slot${
                columnFocused ? " bmxt-split-pane--focused" : ""
              }${pulseSlot === slot ? " bmxt-picker-column-slot--pulse" : ""}`}
              data-picker-slot={slot}
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  return
                }
                props.activatePaneFocus(slot)
              }}>
              {renderPickerSlot(slot, props)}
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
