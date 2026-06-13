/** EN: Backward-compatible alias — prefer `side-picker/interaction/picker-list-scroll`. */
import {
  scrollPickerListRowIntoView,
  scrollPickerListToHi,
  scrollPickerListToHiAfterLayout
} from "../side-picker/interaction/picker-list-scroll"

export { scrollPickerListRowIntoView, scrollPickerListToHi, scrollPickerListToHiAfterLayout }

/** @deprecated Use `scrollPickerListToHi`. */
export function scrollDomPickerListToHi(
  listEl: HTMLElement | null,
  rowIdPrefix: string,
  hi: number
): void {
  scrollPickerListToHi(listEl, rowIdPrefix, hi)
}
