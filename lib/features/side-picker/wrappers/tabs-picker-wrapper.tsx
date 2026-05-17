import type { MutableRefObject } from "react"
import { TabsUrlListPicker } from "../../tabs/tabs-url-list-picker"
import { useTabPickerController } from "../../tabs/use-tab-picker-controller"
import type { TabPickerRow } from "../../tabs/picker-rows"

export type TabsPickerWrapperProps = {
  rows: TabPickerRow[]
  showUrl: boolean
  initialHi: number
  variant?: "default" | "groupNew"
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  onReturnToPrompt: () => void
  isHostPaneFocused: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId: string
}

/** EN: Layer ③C — tabs on UrlList picker shell (`usePlainPickerKeyboard` + bulk/edit extensions). */
export function TabsPickerWrapper(props: TabsPickerWrapperProps) {
  return <TabsUrlListPicker {...useTabPickerController(props)} />
}
