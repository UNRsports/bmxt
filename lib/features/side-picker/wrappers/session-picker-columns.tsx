import { Fragment } from "react"
import type { SessionPickerColumnsProps } from "./picker-slot-registry"
import { PICKER_SLOT_ORDER, renderPickerSlot } from "./picker-slot-registry"

export type { SessionPickerColumnsProps } from "./picker-slot-registry"

/** EN: Layer ②+③ — open picker columns for one session leaf (registry). */
export function SessionPickerColumns(props: SessionPickerColumnsProps) {
  return (
    <>
      {PICKER_SLOT_ORDER.map((slot) => (
        <Fragment key={slot}>{renderPickerSlot(slot, props)}</Fragment>
      ))}
    </>
  )
}
