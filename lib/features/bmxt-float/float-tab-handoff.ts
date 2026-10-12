/**
 * EN: Move float sessions/browse across tab close to the next active (or pending) tab.
 * JA: タブ閉鎖時にフロートのセッション／ブラウズ状態を次のアクティブ（または保留）タブへ引き継ぐ。
 */

import { FLOAT_PENDING_HANDOFF_KEY, MAX_SESSION_LOG_LINES } from "../extension-storage/keys.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"
import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers.ts"
import {
  createEmptyFloatBrowseState,
  isFloatBrowseStateV1,
  loadFloatBrowseStateForTab,
  saveFloatBrowseStateForTab,
  type FloatBrowseStateV1
} from "./float-browse-state-storage.ts"
import {
  loadFloatPickersForTab,
  parseFloatPickersBySession,
  saveFloatPickersForTab
} from "./float-pickers-by-tab-storage.ts"
import {
  isTerminalSessionsStateV1,
  loadFloatTerminalSessionsForTab,
  saveFloatTerminalSessionsForTab
} from "./float-terminal-session-storage.ts"
import {
  hydrateFloatVisibleTabs,
  isFloatDesiredVisibleOnTab,
  setFloatDesiredVisibleOnTab
} from "./float-visible-tabs.ts"

export type FloatTabHandoffPayload = {
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  pickersBySession: SessionPickersByLeaf
}

export type FloatPendingHandoffV1 = {
  v: 1
  payload: FloatTabHandoffPayload
}

function emptySessionsFallback(): TerminalSessionsStateV1 {
  const id = `handoff_${Date.now()}`
  return {
    v: 2,
    order: [id],
    activeId: id,
    logsById: { [id]: [] },
    namesById: {}
  }
}

export function isFloatPendingHandoffV1(value: unknown): value is FloatPendingHandoffV1 {
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
  // EN: pickersBySession is optional for backward-compatible pending blobs.
  if (
    payload.pickersBySession !== undefined &&
    parseFloatPickersBySession(payload.pickersBySession) === null
  ) {
    return false
  }
  return true
}

function normalizeHandoffPayload(raw: {
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  pickersBySession?: unknown
}): FloatTabHandoffPayload {
  return {
    sessions: raw.sessions,
    browse: raw.browse,
    pickersBySession: parseFloatPickersBySession(raw.pickersBySession) ?? {}
  }
}

export function appendHandoffLogLines(
  sessions: TerminalSessionsStateV1,
  sessionId: string,
  lines: readonly string[]
): TerminalSessionsStateV1 {
  if (lines.length === 0) {
    return sessions
  }
  const id = sessions.order.includes(sessionId) ? sessionId : sessions.activeId
  const prev = sessions.logsById[id] ?? []
  return {
    ...sessions,
    logsById: {
      ...sessions.logsById,
      [id]: [...prev, ...lines].slice(-MAX_SESSION_LOG_LINES)
    }
  }
}

/**
 * EN: Snapshot float state for a tab that is about to close (null = nothing to migrate).
 */
export async function takeFloatHandoffFromTab(
  tabId: number
): Promise<FloatTabHandoffPayload | null> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return null
  }
  await hydrateFloatVisibleTabs()
  const desired = isFloatDesiredVisibleOnTab(tabId)
  const sessions = await loadFloatTerminalSessionsForTab(tabId)
  const browse = await loadFloatBrowseStateForTab(tabId)
  const pickersBySession = (await loadFloatPickersForTab(tabId)) ?? {}
  if (
    !desired &&
    sessions === null &&
    browse === null &&
    Object.keys(pickersBySession).length === 0
  ) {
    return null
  }
  return {
    sessions: sessions ?? emptySessionsFallback(),
    browse: browse ?? createEmptyFloatBrowseState(),
    pickersBySession
  }
}

export async function loadPendingFloatHandoff(): Promise<FloatPendingHandoffV1 | null> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_PENDING_HANDOFF_KEY)
    const value = raw[FLOAT_PENDING_HANDOFF_KEY]
    if (!isFloatPendingHandoffV1(value)) {
      return null
    }
    return {
      v: 1,
      payload: normalizeHandoffPayload(value.payload)
    }
  } catch {
    return null
  }
}

export async function savePendingFloatHandoff(payload: FloatTabHandoffPayload): Promise<void> {
  try {
    const pending: FloatPendingHandoffV1 = { v: 1, payload }
    await chrome.storage.session.set({ [FLOAT_PENDING_HANDOFF_KEY]: pending })
  } catch {
    /* session storage unavailable */
  }
}

export async function clearPendingFloatHandoff(): Promise<void> {
  try {
    await chrome.storage.session.remove(FLOAT_PENDING_HANDOFF_KEY)
  } catch {
    /* ignore */
  }
}

export type PlaceFloatHandoffResult = "shown" | "pending" | "dropped" | "failed"

/**
 * EN: Write handoff onto a destination tab, or park as pending until a scriptable page appears.
 * JA: 移動先へ書き込む。show が false のときは `failed`（呼び出し側で popup 退避など）。
 */
export async function placeFloatHandoffOnTab(
  payload: FloatTabHandoffPayload,
  destTabId: number | null,
  destUrl: string | undefined,
  showFloat: (tabId: number) => Promise<boolean | void>
): Promise<PlaceFloatHandoffResult> {
  if (destTabId === null || !Number.isInteger(destTabId) || destTabId < 0) {
    await savePendingFloatHandoff(payload)
    return "pending"
  }
  if (!isScriptablePageUrl(destUrl)) {
    await savePendingFloatHandoff(payload)
    return "pending"
  }
  const normalized = normalizeHandoffPayload(payload)
  await saveFloatTerminalSessionsForTab(destTabId, normalized.sessions)
  await saveFloatBrowseStateForTab(destTabId, normalized.browse)
  await saveFloatPickersForTab(destTabId, normalized.pickersBySession)
  await setFloatDesiredVisibleOnTab(destTabId, true)
  await clearPendingFloatHandoff()
  const shown = await showFloat(destTabId)
  if (shown === false) {
    // EN: Roll back dest desired so activate fallback → popup does not leave a ghost float.
    await setFloatDesiredVisibleOnTab(destTabId, false)
    return "failed"
  }
  return "shown"
}

/**
 * EN: If a pending handoff exists and `tabId` is scriptable, deliver it and show the float.
 */
export async function tryDeliverPendingFloatHandoff(
  tabId: number,
  url: string | undefined,
  showFloat: (tabId: number) => Promise<boolean | void>
): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  if (!isScriptablePageUrl(url)) {
    return false
  }
  const pending = await loadPendingFloatHandoff()
  if (!pending) {
    return false
  }
  const normalized = normalizeHandoffPayload(pending.payload)
  await saveFloatTerminalSessionsForTab(tabId, normalized.sessions)
  await saveFloatBrowseStateForTab(tabId, normalized.browse)
  await saveFloatPickersForTab(tabId, normalized.pickersBySession)
  await setFloatDesiredVisibleOnTab(tabId, true)
  await clearPendingFloatHandoff()
  await showFloat(tabId)
  return true
}
