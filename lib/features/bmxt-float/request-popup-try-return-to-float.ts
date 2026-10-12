/**
 * EN: Popup UI → SW: try moving the prompt onto a tab float after picker activate.
 * JA: ポップアップ UI → SW。ピッカー活性化後にフロート復帰を試す。
 */

import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"
import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers.ts"
import type { FloatBrowseStateV1 } from "./float-browse-state-storage.ts"
import {
  BMXT_POPUP_TRY_RETURN_TO_FLOAT_MESSAGE_TYPE,
  type BmxtPopupTryReturnToFloatResponse
} from "./float-auto-host-switch.ts"

export async function requestPopupTryReturnToFloat(args: {
  toTabId: number
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  pickersBySession?: SessionPickersByLeaf
}): Promise<boolean> {
  if (!Number.isInteger(args.toTabId) || args.toTabId < 0) {
    return false
  }
  try {
    const response = (await chrome.runtime.sendMessage({
      type: BMXT_POPUP_TRY_RETURN_TO_FLOAT_MESSAGE_TYPE,
      toTabId: args.toTabId,
      sessions: args.sessions,
      browse: args.browse,
      pickersBySession: args.pickersBySession
    })) as BmxtPopupTryReturnToFloatResponse | undefined
    return response?.ok === true && response.switched === true
  } catch {
    return false
  }
}
