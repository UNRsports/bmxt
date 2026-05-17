import { TabPickerView } from "./tab-picker-view"
import { useTabPickerController, type TabPickerOverlayProps } from "./use-tab-picker-controller"

export type { TabPickerOverlayProps }

/** EN: Layer ④ entry — wires controller (keyboard kernel + tabs reducer) to presentation. */
export function TabPickerOverlay(props: TabPickerOverlayProps) {
  return <TabPickerView {...useTabPickerController(props)} />
}
