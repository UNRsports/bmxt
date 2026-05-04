import {
  MAX_SESSION_LOG_LINES,
  SESSION_LOG_KEY,
  SPLIT_SESSION_KEY
} from "../extension-storage/keys"
import { allPaneIds } from "./layout-ops"
import type { LayoutNode, SplitSessionV1 } from "./types"

export function newPaneId(): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
  return `pane_${id}`
}

export function emptySession(): SplitSessionV1 {
  const id = newPaneId()
  return {
    v: 1,
    root: { type: "leaf", paneId: id },
    paneLogs: { [id]: [] },
    focusedPaneId: id
  }
}

export async function readSplitSessionRaw(): Promise<SplitSessionV1 | undefined> {
  const r = await chrome.storage.local.get(SPLIT_SESSION_KEY)
  const raw = r[SPLIT_SESSION_KEY] as SplitSessionV1 | undefined
  if (raw && raw.v === 1 && raw.root && raw.paneLogs && raw.focusedPaneId) {
    return raw
  }
  return undefined
}

/**
 * 旧単一ログのみある場合は 1 ペインへ移行する。
 */
export async function loadOrMigrateSplitSession(): Promise<SplitSessionV1> {
  const existing = await readSplitSessionRaw()
  if (existing) {
    return normalizeSession(existing)
  }
  const legacy = await chrome.storage.local.get(SESSION_LOG_KEY)
  const lines = (legacy[SESSION_LOG_KEY] as string[] | undefined) ?? []
  const id = newPaneId()
  const session: SplitSessionV1 = {
    v: 1,
    root: { type: "leaf", paneId: id },
    paneLogs: { [id]: lines.slice(-MAX_SESSION_LOG_LINES) },
    focusedPaneId: id
  }
  await chrome.storage.local.set({ [SPLIT_SESSION_KEY]: session })
  void chrome.storage.local.remove(SESSION_LOG_KEY)
  return session
}

export function normalizeSession(s: SplitSessionV1): SplitSessionV1 {
  const ids = new Set(allPaneIds(s.root))
  const nextLogs = { ...s.paneLogs }
  for (const id of Object.keys(nextLogs)) {
    if (!ids.has(id)) {
      delete nextLogs[id]
    }
  }
  for (const id of ids) {
    if (!nextLogs[id]) {
      nextLogs[id] = []
    }
  }
  let focus = s.focusedPaneId
  if (!ids.has(focus)) {
    focus = [...ids][0] ?? focus
  }
  return { ...s, paneLogs: nextLogs, focusedPaneId: focus }
}

export async function saveSplitSession(session: SplitSessionV1): Promise<void> {
  await chrome.storage.local.set({ [SPLIT_SESSION_KEY]: session })
}

export async function setPaneLog(paneId: string, lines: string[]): Promise<void> {
  const session = await loadOrMigrateSplitSession()
  const next: SplitSessionV1 = {
    ...session,
    paneLogs: {
      ...session.paneLogs,
      [paneId]: lines.slice(-MAX_SESSION_LOG_LINES)
    }
  }
  await saveSplitSession(next)
}

export async function appendLinesToPane(
  paneId: string,
  newLines: string[]
): Promise<void> {
  const session = await loadOrMigrateSplitSession()
  const prev = session.paneLogs[paneId] ?? []
  const merged = [...prev, ...newLines].slice(-MAX_SESSION_LOG_LINES)
  const next: SplitSessionV1 = {
    ...session,
    paneLogs: { ...session.paneLogs, [paneId]: merged }
  }
  await saveSplitSession(next)
}

export async function clearPaneLog(paneId: string): Promise<void> {
  const session = await loadOrMigrateSplitSession()
  const next: SplitSessionV1 = {
    ...session,
    paneLogs: { ...session.paneLogs, [paneId]: [] }
  }
  await saveSplitSession(next)
}

export async function setFocusedPane(paneId: string): Promise<void> {
  const session = await loadOrMigrateSplitSession()
  if (!allPaneIds(session.root).includes(paneId)) {
    return
  }
  await saveSplitSession({ ...session, focusedPaneId: paneId })
}
