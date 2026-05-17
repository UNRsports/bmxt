import { TabsUrlListPicker } from "./tabs-url-list-picker"
import { useTabPickerController, type TabPickerOverlayProps } from "./use-tab-picker-controller"

export type { TabPickerOverlayProps }

/** @deprecated Use `TabsPickerWrapper` — thin re-export for callers not yet on side-picker wrapper. */
export function TabPickerOverlay(props: TabPickerOverlayProps) {
  return <TabsUrlListPicker {...useTabPickerController(props)} />
}
