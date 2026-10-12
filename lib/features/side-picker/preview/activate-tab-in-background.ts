import { requestFloatActivateHandoff } from "../../bmxt-float/float-activate-handoff"
import type { SessionPickersByLeaf } from "../session/session-pickers"
import { markPickerSelfTabActivation } from "./picker-self-tab-activation"

export type ActivateTabInBackgroundOptions = {
  /** EN: Hosting float tab id — when set, hand off float sessions/browse/pickers first. */
  floatHostTabId?: number | null
  flushFloatPersist?: () => Promise<void>
  getFloatPickersSnapshot?: () => SessionPickersByLeaf
}

/** EN: Activate a tab without focusing its window (picker background preview). */
export async function activateTabInBackground(
  tabId: number,
  options?: ActivateTabInBackgroundOptions
): Promise<boolean> {
  try {
    if (options?.floatHostTabId != null) {
      await requestFloatActivateHandoff({
        fromTabId: options.floatHostTabId,
        toTabId: tabId,
        flushPersist: options.flushFloatPersist,
        pickersBySession: options.getFloatPickersSnapshot?.()
      })
    }
    markPickerSelfTabActivation(tabId)
    await chrome.tabs.update(tabId, { active: true })
    return true
  } catch {
    return false
  }
}
