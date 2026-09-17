/**
 * EN: Pending sessions/browse for the popup window after `switchwindow` from float.
 * JA: float から `switchwindow` したあと、ポップアップが読む引き継ぎ。
 */

import { POPUP_PENDING_HANDOFF_KEY } from "../extension-storage/keys.ts"
import type { FloatTabHandoffPayload } from "./float-tab-handoff.ts"
import { isTerminalSessionsStateV1 } from "./float-terminal-session-storage.ts"
import {
  isFloatBrowseStateV1,
  parseFloatBrowseState,
  type FloatBrowseStateV1
} from "./float-browse-state-storage.ts"

export const POPUP_HANDOFF_READY_MESSAGE = "POPUP_HANDOFF_READY" as const

export type PopupPendingHandoffV1 = {
  v: 1
  payload: FloatTabHandoffPayload
}

export type PopupHandoffReadyMessage = {
  type: typeof POPUP_HANDOFF_READY_MESSAGE
}

/** EN: Browse half of the last taken popup handoff (sessions hook consumes first). */
let retainedPopupBrowse: FloatBrowseStateV1 | null = null

export function retainPopupBrowseForUi(browse: FloatBrowseStateV1): void {
  retainedPopupBrowse = browse
}

export function takeRetainedPopupBrowseForUi(): FloatBrowseStateV1 | null {
  const browse = retainedPopupBrowse
  retainedPopupBrowse = null
  return browse
}

export function isPopupPendingHandoffV1(value: unknown): value is PopupPendingHandoffV1 {
  if (!value || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (o.v !== 1 || !o.payload || typeof o.payload !== "object") {
    return false
  }
  const payload = o.payload as Record<string, unknown>
  if (!isTerminalSessionsStateV1(payload.sessions)) {
    return false
  }
  if (!isFloatBrowseStateV1(payload.browse)) {
    return false
  }
  return true
}

export function isPopupHandoffReadyMessage(message: unknown): message is PopupHandoffReadyMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  return (message as { type?: string }).type === POPUP_HANDOFF_READY_MESSAGE
}

export async function loadPendingPopupHandoff(): Promise<PopupPendingHandoffV1 | null> {
  try {
    const raw = await chrome.storage.session.get(POPUP_PENDING_HANDOFF_KEY)
    const value = raw[POPUP_PENDING_HANDOFF_KEY]
    if (!isPopupPendingHandoffV1(value)) {
      return null
    }
    const browse = parseFloatBrowseState(value.payload.browse)
    if (browse === null) {
      return null
    }
    return {
      v: 1,
      payload: {
        sessions: value.payload.sessions,
        browse
      }
    }
  } catch {
    return null
  }
}

export async function savePendingPopupHandoff(payload: FloatTabHandoffPayload): Promise<void> {
  try {
    const pending: PopupPendingHandoffV1 = { v: 1, payload }
    await chrome.storage.session.set({ [POPUP_PENDING_HANDOFF_KEY]: pending })
  } catch {
    /* session storage unavailable */
  }
}

export async function clearPendingPopupHandoff(): Promise<void> {
  try {
    await chrome.storage.session.remove(POPUP_PENDING_HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

/** EN: Take pending handoff and clear storage (null if none). */
export async function takePendingPopupHandoff(): Promise<FloatTabHandoffPayload | null> {
  const pending = await loadPendingPopupHandoff()
  if (!pending) {
    return null
  }
  await clearPendingPopupHandoff()
  retainPopupBrowseForUi(pending.payload.browse)
  return pending.payload
}

/**
 * EN: Coalesce concurrent takes (sessions + process-UI listeners on POPUP_HANDOFF_READY).
 */
let inFlightPopupHandoffTake: Promise<FloatTabHandoffPayload | null> | null = null

export function takePendingPopupHandoffOnce(): Promise<FloatTabHandoffPayload | null> {
  if (inFlightPopupHandoffTake === null) {
    inFlightPopupHandoffTake = takePendingPopupHandoff().then((payload) => {
      queueMicrotask(() => {
        inFlightPopupHandoffTake = null
      })
      return payload
    })
  }
  return inFlightPopupHandoffTake
}

export function broadcastPopupHandoffReady(): void {
  try {
    void chrome.runtime.sendMessage({ type: POPUP_HANDOFF_READY_MESSAGE })
  } catch {
    /* no listener yet */
  }
}
