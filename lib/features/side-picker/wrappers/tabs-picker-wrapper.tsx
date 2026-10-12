import type { MutableRefObject } from "react"
import { TabsUrlListPicker } from "../../tabs/tabs-url-list-picker"
import { useTabPickerController } from "../../tabs/use-tab-picker-controller"
import type { TabsPageActiveMode } from "../../tabs/page-active-setting"
import type { FloatBrowseStateV1 } from "../../bmxt-float/float-browse-state-storage"
import type { TerminalSessionsStateV1 } from "../../bmxt-window/terminal-sessions/types"
import type { SessionPickersByLeaf } from "../session/session-pickers"

export type TabsPickerWrapperProps = {
  pageActiveMode?: TabsPageActiveMode
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  scheduleRefreshRows?: () => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  isHostPaneFocused: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId: string
  onFocusTabIdChange?: (tabId: number | null) => void
  floatHostTabId?: number | null
  flushFloatPersist?: () => Promise<void>
  getFloatPickersSnapshot?: () => SessionPickersByLeaf
  getPopupReturnPayload?: () => {
    sessions: TerminalSessionsStateV1
    browse: FloatBrowseStateV1
    pickersBySession?: SessionPickersByLeaf
  }
}

/** EN: Layer ③C — tabs picker subscribes to session engine (Chrome → store → UI). */
export function TabsPickerWrapper(props: TabsPickerWrapperProps) {
  const viewProps = useTabPickerController(props)
  if (!viewProps) {
    return null
  }
  return <TabsUrlListPicker {...viewProps} />
}
