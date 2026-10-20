import { TabsUrlListPicker } from "./tabs-url-list-picker"
import { useTabPickerController, type TabPickerOverlayProps } from "./use-tab-picker-controller"

export type { TabPickerOverlayProps }

/** @deprecated Use `TabsPickerWrapper` via side-picker slot registry. */
export function TabPickerOverlay(props: TabPickerOverlayProps) {
  const viewProps = useTabPickerController(props)
  if (!viewProps) {
    return null
  }
  return <TabsUrlListPicker {...viewProps} />
}
