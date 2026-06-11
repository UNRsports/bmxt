import { Fragment } from "react"
import type { PickerSlotId } from "../session/session-pickers"
import type { SessionPickerColumnsProps } from "./picker-slot-registry"
import { renderPickerSlot } from "./picker-slot-registry"

export type { SessionPickerColumnsProps } from "./picker-slot-registry"

type Props = SessionPickerColumnsProps & {
  columnOrder: readonly PickerSlotId[]
  pulseSlot: PickerSlotId | null
}

/** EN: Layer ②+③ — open picker columns for one session leaf (registry). */
export function SessionPickerColumns({ columnOrder, pulseSlot, ...props }: Props) {
  return (
    <>
      {columnOrder.map((slot) => (
        <Fragment key={slot}>
          <div
            className={`bmxt-picker-column-slot${
              pulseSlot === slot ? " bmxt-picker-column-slot--pulse" : ""
            }`}
            data-picker-slot={slot}>
            {renderPickerSlot(slot, props)}
          </div>
        </Fragment>
      ))}
    </>
  )
}
