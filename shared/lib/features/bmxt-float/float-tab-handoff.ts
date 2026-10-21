/**
 * EN: Move float sessions/browse across tab close to the next active (or pending) tab.
 * JA: タブ閉鎖時にフロートのセッション／ブラウズ状態を次のアクティブ（または保留）タブへ引き継ぐ。
 */

import { FLOAT_PENDING_HANDOFF_KEY, MAX_SESSION_LOG_LINES } from "../extension-storage/keys.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"
import {
  createEmptyFloatBrowseState,
  isFloatBrowseStateV1,
  loadFloatBrowseStateForTab,
  saveFloatBrowseStateForTab,
  type FloatBrowseStateV1
} from "./float-browse-state-storage.ts"
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
  return true
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
  if (!desired && sessions === null && browse === null) {
    return null
  }
  return {
    sessions: sessions ?? emptySessionsFallback(),
    browse: browse ?? createEmptyFloatBrowseState()
  }
}

export async function loadPendingFloatHandoff(): Promise<FloatPendingHandoffV1 | null> {
  try {
    const raw = await chrome.storage.session.get(FLOAT_PENDING_HANDOFF_KEY)
    const value = raw[FLOAT_PENDING_HANDOFF_KEY]
    if (!isFloatPendingHandoffV1(value)) {
      return null
    }
    return value
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

export type PlaceFloatHandoffResult = "shown" | "pending" | "dropped"

/**
 * EN: Write handoff onto a destination tab, or park as pending until a scriptable page appears.
 */
export async function placeFloatHandoffOnTab(
  payload: FloatTabHandoffPayload,
  destTabId: number | null,
  destUrl: string | undefined,
  showFloat: (tabId: number) => Promise<void>
): Promise<PlaceFloatHandoffResult> {
  if (destTabId === null || !Number.isInteger(destTabId) || destTabId < 0) {
    await savePendingFloatHandoff(payload)
    return "pending"
  }
  if (!isScriptablePageUrl(destUrl)) {
    await savePendingFloatHandoff(payload)
    return "pending"
  }
  await saveFloatTerminalSessionsForTab(destTabId, payload.sessions)
  await saveFloatBrowseStateForTab(destTabId, payload.browse)
  await setFloatDesiredVisibleOnTab(destTabId, true)
  await clearPendingFloatHandoff()
  await showFloat(destTabId)
  return "shown"
}

/**
 * EN: If a pending handoff exists and `tabId` is scriptable, deliver it and show the float.
 */
export async function tryDeliverPendingFloatHandoff(
  tabId: number,
  url: string | undefined,
  showFloat: (tabId: number) => Promise<void>
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
  await saveFloatTerminalSessionsForTab(tabId, pending.payload.sessions)
  await saveFloatBrowseStateForTab(tabId, pending.payload.browse)
  await setFloatDesiredVisibleOnTab(tabId, true)
  await clearPendingFloatHandoff()
  await showFloat(tabId)
  return true
}
