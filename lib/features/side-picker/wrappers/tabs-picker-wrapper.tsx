import type { MutableRefObject } from "react"
import type { TabPickerInteractiveSnapshot } from "../session/tab-picker-state"
import { TabsUrlListPicker } from "../../tabs/tabs-url-list-picker"
import { useTabPickerController } from "../../tabs/use-tab-picker-controller"
import type { TabPickerRow } from "../../tabs/picker-rows"
import type { TabsPageActiveMode } from "../../tabs/page-active-setting"

export type TabsPickerWrapperProps = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  pageActiveMode?: TabsPageActiveMode
  variant?: "default" | "groupNew"
  interactive?: TabPickerInteractiveSnapshot
  onInteractiveSnapshotChange?: (snapshot: TabPickerInteractiveSnapshot) => void
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  scheduleRefreshRows?: () => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  isHostPaneFocused: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId: string
  onFocusTabIdChange?: (tabId: number | null) => void
}

/** EN: Layer ③C — tabs on UrlList picker shell (`usePlainPickerKeyboard` + bulk/edit extensions). */
export function TabsPickerWrapper(props: TabsPickerWrapperProps) {
  return <TabsUrlListPicker {...useTabPickerController(props)} />
}
