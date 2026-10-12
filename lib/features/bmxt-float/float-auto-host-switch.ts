/**
 * EN: Automatic popup ↔ float host switch when float cannot (or can again) be shown.
 * JA: フロート表示不可／再可能時の popup ↔ float 自動切替。
 */

import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  createEmptyFloatBrowseState,
  saveFloatBrowseStateForTab,
  type FloatBrowseStateV1
} from "./float-browse-state-storage.ts"
import { saveFloatPickersForTab } from "./float-pickers-by-tab-storage.ts"
import {
  isTerminalSessionsStateV1,
  saveFloatTerminalSessionsForTab
} from "./float-terminal-session-storage.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"
import {
  broadcastPopupHandoffReady,
  savePendingPopupHandoff
} from "./popup-pending-handoff.ts"
import { savePromptLaunchHostAsync } from "./prompt-launch-host.ts"
import { setFloatDesiredVisibleOnTab } from "./float-visible-tabs.ts"
import {
  clearPendingFloatHandoff,
  type FloatTabHandoffPayload
} from "./float-tab-handoff.ts"

export type AutoHostSwitchPayload = {
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  pickersBySession: SessionPickersByLeaf
}

export const BMXT_POPUP_TRY_RETURN_TO_FLOAT_MESSAGE_TYPE =
  "BMXT_POPUP_TRY_RETURN_TO_FLOAT" as const

export type BmxtPopupTryReturnToFloatMessage = {
  type: typeof BMXT_POPUP_TRY_RETURN_TO_FLOAT_MESSAGE_TYPE
  toTabId: number
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  pickersBySession?: SessionPickersByLeaf
}

export type BmxtPopupTryReturnToFloatResponse = {
  ok: true
  switched: boolean
} | {
  ok: false
  reason: string
}

export function isBmxtPopupTryReturnToFloatMessage(
  message: unknown
): message is BmxtPopupTryReturnToFloatMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as {
    type?: string
    toTabId?: unknown
    sessions?: unknown
    browse?: unknown
  }
  if (typed.type !== BMXT_POPUP_TRY_RETURN_TO_FLOAT_MESSAGE_TYPE) {
    return false
  }
  if (typeof typed.toTabId !== "number" || !Number.isInteger(typed.toTabId) || typed.toTabId < 0) {
    return false
  }
  if (!isTerminalSessionsStateV1(typed.sessions)) {
    return false
  }
  if (!typed.browse || typeof typed.browse !== "object") {
    return false
  }
  return true
}

/** EN: Avoid thrashing popup↔float on the same tab within a short window. */
let lastAutoSwitchTabId: number | null = null
let lastAutoSwitchAtMs = 0
const AUTO_SWITCH_COOLDOWN_MS = 800

function allowAutoSwitchForTab(tabId: number): boolean {
  const now = Date.now()
  if (lastAutoSwitchTabId === tabId && now - lastAutoSwitchAtMs < AUTO_SWITCH_COOLDOWN_MS) {
    return false
  }
  lastAutoSwitchTabId = tabId
  lastAutoSwitchAtMs = now
  return true
}

export function appendAutoSwitchLogLine(
  payload: AutoHostSwitchPayload,
  line: string
): AutoHostSwitchPayload {
  if (line.length === 0) {
    return payload
  }
  const id = payload.sessions.activeId
  const prev = payload.sessions.logsById[id] ?? []
  return {
    ...payload,
    sessions: {
      ...payload.sessions,
      logsById: {
        ...payload.sessions.logsById,
        [id]: [...prev, line]
      }
    }
  }
}

/**
 * EN: Float cannot show on dest — park sessions in popup pending handoff and open popup.
 */
export async function autoSwitchFloatToPopup(args: {
  payload: FloatTabHandoffPayload | AutoHostSwitchPayload
  hideFloatTabIds: readonly number[]
  openOrFocusPopup: () => Promise<void>
  hideFloat: (tabId: number) => Promise<void>
  /** EN: Pre-translated log line (caller owns i18n). */
  logLine?: string
}): Promise<void> {
  let payload: AutoHostSwitchPayload = {
    sessions: args.payload.sessions,
    browse: args.payload.browse ?? createEmptyFloatBrowseState(),
    pickersBySession: args.payload.pickersBySession ?? {}
  }
  if (typeof args.logLine === "string") {
    payload = appendAutoSwitchLogLine(payload, args.logLine)
  }

  await clearPendingFloatHandoff()
  await savePendingPopupHandoff(payload)
  await savePromptLaunchHostAsync("popup")
  await args.openOrFocusPopup()
  broadcastPopupHandoffReady()

  for (const tabId of args.hideFloatTabIds) {
    if (typeof tabId === "number" && Number.isInteger(tabId) && tabId >= 0) {
      await args.hideFloat(tabId)
    }
  }
}

/**
 * EN: Popup can show float on dest — move UI onto the tab and close the popup window.
 */
export async function autoSwitchPopupToFloat(args: {
  toTabId: number
  payload: AutoHostSwitchPayload
  showFloat: (tabId: number) => Promise<boolean>
  closePopup: () => Promise<void>
  /** EN: Pre-translated log line (caller owns i18n). */
  logLine?: string
}): Promise<boolean> {
  if (!allowAutoSwitchForTab(args.toTabId)) {
    return false
  }

  let destUrl: string | undefined
  try {
    const tab = await chrome.tabs.get(args.toTabId)
    destUrl = tab.url
  } catch {
    return false
  }
  if (!isScriptablePageUrl(destUrl)) {
    return false
  }

  let payload = args.payload
  if (typeof args.logLine === "string") {
    payload = appendAutoSwitchLogLine(payload, args.logLine)
  }

  await saveFloatTerminalSessionsForTab(args.toTabId, payload.sessions)
  await saveFloatBrowseStateForTab(args.toTabId, payload.browse)
  await saveFloatPickersForTab(args.toTabId, payload.pickersBySession)
  await setFloatDesiredVisibleOnTab(args.toTabId, true)

  const shown = await args.showFloat(args.toTabId)
  if (!shown) {
    await setFloatDesiredVisibleOnTab(args.toTabId, false)
    return false
  }

  await savePromptLaunchHostAsync("float")
  await args.closePopup()
  return true
}
