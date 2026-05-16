import type { MutableRefObject } from "react"
import { TabPickerOverlay } from "../../tabs/picker-overlay"
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

/** EN: Layer ③C — interactive tab picker (bulk/edit remain in tabs feature). */
export function TabsPickerWrapper(props: TabsPickerWrapperProps) {
  return <TabPickerOverlay {...props} />
}
