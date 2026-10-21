import type { CSSProperties } from "react"
import type { PickerSlotId } from "../session/session-pickers"
import { SessionPickerColumns, type SessionPickerColumnsProps } from "./session-picker-columns"

type Props = SessionPickerColumnsProps & {
  railPickers: readonly PickerSlotId[]
  railExpanded: boolean
  columnOrder: readonly PickerSlotId[]
  pulseSlot: PickerSlotId | null
}

function resolveVisibleColumnOrder(
  columnOrder: readonly PickerSlotId[],
  railPickers: readonly PickerSlotId[]
): readonly PickerSlotId[] {
  const filtered = columnOrder.filter((slot) => railPickers.includes(slot))
  if (filtered.length > 0) {
    return filtered
  }
  return railPickers
}

/** EN: Layer ② rail — picker columns slide in from the right, pushing the terminal pane. */
export function PickerRail({
  railPickers,
  railExpanded,
  columnOrder,
  pulseSlot,
  ...props
}: Props) {
  const visibleColumnOrder = resolveVisibleColumnOrder(columnOrder, railPickers)
  const railFlex = Math.max(railPickers.length, 1)
  const style = {
    "--bmxt-picker-rail-flex": String(railFlex)
  } as CSSProperties

  return (
    <div
      className={`bmxt-picker-rail${railExpanded ? " bmxt-picker-rail--expanded" : ""}`}
      style={style}
      data-picker-rail={railPickers.length > 0 ? "visible" : "empty"}
      aria-hidden={railPickers.length === 0}>
      {railPickers.length > 0 ? (
        <SessionPickerColumns
          columnOrder={visibleColumnOrder}
          pulseSlot={pulseSlot}
          {...props}
        />
      ) : null}
    </div>
  )
}
