import { requestFloatActivateHandoff } from "../../bmxt-float/float-activate-handoff"
import { requestPopupTryReturnToFloat } from "../../bmxt-float/request-popup-try-return-to-float"
import type { FloatBrowseStateV1 } from "../../bmxt-float/float-browse-state-storage"
import type { TerminalSessionsStateV1 } from "../../bmxt-window/terminal-sessions/types"
import type { SessionPickersByLeaf } from "../session/session-pickers"
import { markPickerSelfTabActivation } from "./picker-self-tab-activation"

export type ActivateTabInBackgroundOptions = {
  /** EN: Hosting float tab id — when set, hand off float sessions/browse/pickers first. */
  floatHostTabId?: number | null
  flushFloatPersist?: () => Promise<void>
  getFloatPickersSnapshot?: () => SessionPickersByLeaf
  /**
   * EN: Popup host — after activate, try returning UI to float on this tab when showable.
   * JA: ポップアップ時。活性化先でフロート表示できれば popup→float 復帰を試す。
   */
  getPopupReturnPayload?: () => {
    sessions: TerminalSessionsStateV1
    browse: FloatBrowseStateV1
    pickersBySession?: SessionPickersByLeaf
  }
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
    if (options?.floatHostTabId == null && options?.getPopupReturnPayload) {
      const payload = options.getPopupReturnPayload()
      void requestPopupTryReturnToFloat({
        toTabId: tabId,
        sessions: payload.sessions,
        browse: payload.browse,
        pickersBySession: payload.pickersBySession
      })
    }
    return true
  } catch {
    return false
  }
}
