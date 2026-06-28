import type { DetailBarId } from "../bmxt-window/detail-bar-focus"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type { DomListPickerState } from "./dom-list-picker-input"

/** EN: Tab-follow refresh applies only when the dom column or detail bar holds focus. */
export function isDomListPickerFollowEnabled(
  picker: DomListPickerState | null,
  paneFocus: PaneFocusTarget,
  detailBarId: DetailBarId | null
): boolean {
  if (picker?.kind !== "lines") {
    return false
  }
  if (paneFocus === "dom") {
    return true
  }
  return paneFocus === "detailBar" && detailBarId === "dom"
}
