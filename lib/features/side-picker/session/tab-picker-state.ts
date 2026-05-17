import type { TabPickerRow } from "../../tabs/picker-rows"

/** EN: Open tab picker column state for one session leaf. */
export type TabPickerState = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
}
