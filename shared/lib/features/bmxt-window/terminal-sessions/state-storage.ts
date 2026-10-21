import {
  ACTIVE_TERMINAL_SESSION_KEY,
  CMD_HISTORY_KEY,
  MAX_SESSION_LOG_LINES,
  PROCESS_UI_STATE_KEY,
  SESSION_LOG_KEY,
  SPLIT_LAYOUT_KEY,
  TAB_PICKER_FOLD_STATE_KEY,
  TERMINAL_SESSIONS_KEY
} from "../../extension-storage/keys"
import { clearProcessUiStateStorage, readProcessUiStateFromStorage } from "../process-ui-state-storage"
import { clearTabPickerFoldStateInMemory, clearTabPickerFoldStateStorage } from "../../tabs/tab-picker-fold-state"
import { sanitizeSessionName } from "../../session/session-summary"
import { deriveDefaultSessionName } from "../../session/session-summary"
import type { SessionPickerState } from "../../side-picker/session/session-pickers"
import type { SplitLayoutV1 } from "../split-layout/types"
import { isValidLayout, listLeafIds } from "../split-layout/tree"
import type { TerminalSessionsStateV1 } from "./types"

export {
  createEmptyTerminalSessionsState,
  newSessionId,
  resolveSessionId,
  trimSessionLog
} from "./session-state-ops"

import {
  createEmptyTerminalSessionsState,
  newSessionId,
  resolveSessionId,
  trimSessionLog
} from "./session-state-ops"

/** 旧マルチペインセッションキー（移行のみ）。 */
const LEGACY_SPLIT_KEY = "bmxt_split_session"

const LEGACY_TERMINAL_STORAGE_KEYS = [
  TERMINAL_SESSIONS_KEY,
  SPLIT_LAYOUT_KEY,
  ACTIVE_TERMINAL_SESSION_KEY,
  SESSION_LOG_KEY,
  LEGACY_SPLIT_KEY
] as const

async function removeLegacyTerminalStorageKeys(): Promise<void> {
  await chrome.storage.local.remove([...LEGACY_TERMINAL_STORAGE_KEYS])
}

type LegacySplitSession = {
  v: 1
  paneLogs: Record<string, string[]>
  focusedPaneId: string
}

/** `TERMINAL_SESSIONS_KEY` に保存する本体（v2: タブ時代）。 */
type StoredSessionsBodyV2 = {
  v: 2
  logsById: Record<string, string[]>
  order: string[]
}

type StoredLogsV3 = {
  v: 3
  logsById: Record<string, string[]>
}

type StoredSessionsBodyV4 = {
  v: 4
  logsById: Record<string, string[]>
  order: string[]
  activeId: string
}

type StoredSessionsBodyV5 = {
  v: 5
  logsById: Record<string, string[]>
  order: string[]
  activeId: string
  namesById: Record<string, string>
}

function emptyState(): TerminalSessionsStateV1 {
  return createEmptyTerminalSessionsState()
}

/** 旧: 単一キーに order + activeId を含むブロブ。 */
type LegacyCombinedV1 = {
  v: 1
  logsById: Record<string, string[]>
  order: string[]
  activeId: string
}

function isCombinedV1Stored(x: unknown): x is LegacyCombinedV1 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as LegacyCombinedV1
  if (o.v !== 1 || typeof o.logsById !== "object" || !Array.isArray(o.order)) {
    return false
  }
  if (typeof o.activeId !== "string" || o.order.length === 0) {
    return false
  }
  if (!o.order.includes(o.activeId)) {
    return false
  }
  for (const id of o.order) {
    if (!Array.isArray(o.logsById[id])) {
      return false
    }
  }
  return true
}

function isBodyV2Stored(x: unknown): x is StoredSessionsBodyV2 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as StoredSessionsBodyV2
  if (o.v !== 2 || typeof o.logsById !== "object" || !Array.isArray(o.order)) {
    return false
  }
  if (o.order.length === 0) {
    return false
  }
  for (const id of o.order) {
    if (!Array.isArray(o.logsById[id])) {
      return false
    }
  }
  return true
}

function isBodyV3Stored(x: unknown): x is StoredLogsV3 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as StoredLogsV3
  if (o.v !== 3 || typeof o.logsById !== "object") {
    return false
  }
  return true
}

function isBodyV5Stored(x: unknown): x is StoredSessionsBodyV5 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as StoredSessionsBodyV5
  if (o.v !== 5 || typeof o.logsById !== "object" || !Array.isArray(o.order)) {
    return false
  }
  if (o.order.length === 0 || typeof o.activeId !== "string") {
    return false
  }
  if (!o.order.includes(o.activeId) || typeof o.namesById !== "object") {
    return false
  }
  for (const id of o.order) {
    if (!Array.isArray(o.logsById[id])) {
      return false
    }
  }
  return true
}

function isBodyV4Stored(x: unknown): x is StoredSessionsBodyV4 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as StoredSessionsBodyV4
  if (o.v !== 4 || typeof o.logsById !== "object" || !Array.isArray(o.order)) {
    return false
  }
  if (o.order.length === 0 || typeof o.activeId !== "string") {
    return false
  }
  if (!o.order.includes(o.activeId)) {
    return false
  }
  for (const id of o.order) {
    if (!Array.isArray(o.logsById[id])) {
      return false
    }
  }
  return true
}

function stateFromV5Body(body: StoredSessionsBodyV5): TerminalSessionsStateV1 {
  return {
    v: 2,
    logsById: body.logsById,
    order: [...body.order],
    activeId: body.activeId,
    namesById: { ...body.namesById }
  }
}

function stateFromV4Body(body: StoredSessionsBodyV4): TerminalSessionsStateV1 {
  return {
    v: 2,
    logsById: body.logsById,
    order: [...body.order],
    activeId: body.activeId,
    namesById: {}
  }
}

function ensureActiveInOrder(state: TerminalSessionsStateV1): TerminalSessionsStateV1 {
  if (state.order.includes(state.activeId)) {
    return state
  }
  const activeId = state.order[0] ?? state.activeId
  return { ...state, activeId }
}

async function legacyLinesFromSplitOrLog(): Promise<string[] | null> {
  const r = await chrome.storage.local.get([SESSION_LOG_KEY, LEGACY_SPLIT_KEY])
  if (Array.isArray(r[SESSION_LOG_KEY])) {
    return trimSessionLog(r[SESSION_LOG_KEY] as string[])
  }
  const legacy = r[LEGACY_SPLIT_KEY] as LegacySplitSession | undefined
  if (legacy && legacy.v === 1 && legacy.paneLogs && legacy.focusedPaneId) {
    const lines = legacy.paneLogs[legacy.focusedPaneId] ?? []
    return trimSessionLog(lines)
  }
  return null
}

async function removeLegacyKeys(): Promise<void> {
  await chrome.storage.local.remove([SESSION_LOG_KEY, LEGACY_SPLIT_KEY])
}

function orderFromSplitLayout(layout: SplitLayoutV1, logsById: Record<string, string[]>): {
  order: string[]
  activeId: string
} {
  const fromTree = listLeafIds(layout.root)
  const logKeys = Object.keys(logsById)
  const order: string[] = []
  for (const id of fromTree) {
    if (!order.includes(id)) {
      order.push(id)
    }
  }
  for (const id of logKeys.sort()) {
    if (!order.includes(id)) {
      order.push(id)
    }
  }
  const activeId = layout.focusedLeafId && order.includes(layout.focusedLeafId)
    ? layout.focusedLeafId
    : (order[0] ?? newSessionId())
  return { order, activeId }
}

async function migrateStorageShapes(): Promise<void> {
  const r = await chrome.storage.local.get([
    TERMINAL_SESSIONS_KEY,
    SPLIT_LAYOUT_KEY,
    ACTIVE_TERMINAL_SESSION_KEY
  ])
  const raw = r[TERMINAL_SESSIONS_KEY]
  const layoutRaw = r[SPLIT_LAYOUT_KEY]

  if (isBodyV5Stored(raw)) {
    if (layoutRaw !== undefined) {
      await chrome.storage.local.remove(SPLIT_LAYOUT_KEY)
    }
    return
  }

  if (isBodyV4Stored(raw)) {
    const body: StoredSessionsBodyV5 = {
      v: 5,
      logsById: raw.logsById,
      order: [...raw.order],
      activeId: raw.activeId,
      namesById: {}
    }
    await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
    if (layoutRaw !== undefined) {
      await chrome.storage.local.remove(SPLIT_LAYOUT_KEY)
    }
    return
  }

  if (isBodyV2Stored(raw)) {
    const activeRaw = r[ACTIVE_TERMINAL_SESSION_KEY]
    const activeId =
      typeof activeRaw === "string" && raw.order.includes(activeRaw)
        ? activeRaw
        : raw.order[0]
    const body: StoredSessionsBodyV5 = {
      v: 5,
      logsById: raw.logsById,
      order: [...raw.order],
      activeId,
      namesById: {}
    }
    await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
    await chrome.storage.local.remove([SPLIT_LAYOUT_KEY, ACTIVE_TERMINAL_SESSION_KEY])
    return
  }

  if (isCombinedV1Stored(raw)) {
    const body: StoredSessionsBodyV5 = {
      v: 5,
      logsById: raw.logsById,
      order: [...raw.order],
      activeId: raw.activeId,
      namesById: {}
    }
    await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
    await chrome.storage.local.remove([ACTIVE_TERMINAL_SESSION_KEY, SPLIT_LAYOUT_KEY])
    return
  }

  if (isBodyV3Stored(raw)) {
    if (isValidLayout(layoutRaw)) {
      const { order, activeId } = orderFromSplitLayout(layoutRaw, raw.logsById)
      const body: StoredSessionsBodyV5 = {
        v: 5,
        logsById: raw.logsById,
        order,
        activeId,
        namesById: {}
      }
      await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
      await chrome.storage.local.remove(SPLIT_LAYOUT_KEY)
      return
    }
    const keys = Object.keys(raw.logsById).sort()
    if (keys.length === 0) {
      return
    }
    const body: StoredSessionsBodyV5 = {
      v: 5,
      logsById: raw.logsById,
      order: keys,
      activeId: keys[0]!,
      namesById: {}
    }
    await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
    await chrome.storage.local.remove(SPLIT_LAYOUT_KEY)
  }
}

export async function readTerminalSessionsIfPresent(): Promise<TerminalSessionsStateV1 | null> {
  await migrateStorageShapes()
  const r = await chrome.storage.local.get([TERMINAL_SESSIONS_KEY])
  return parseTerminalSessionsStorageValue(r[TERMINAL_SESSIONS_KEY])
}

/** EN: Parse `chrome.storage.onChanged` `newValue` without an extra storage read. */
export function parseTerminalSessionsStorageValue(raw: unknown): TerminalSessionsStateV1 | null {
  if (!isBodyV5Stored(raw)) {
    return null
  }
  return ensureActiveInOrder(stateFromV5Body(raw))
}

export async function ensureTerminalSessionsState(): Promise<TerminalSessionsStateV1> {
  const cur = await readTerminalSessionsIfPresent()
  if (cur) {
    return cur
  }
  const migrated = await legacyLinesFromSplitOrLog()
  if (migrated !== null) {
    const id = newSessionId()
    const state: TerminalSessionsStateV1 = {
      v: 2,
      logsById: { [id]: migrated },
      order: [id],
      activeId: id,
      namesById: {}
    }
    await persistTerminalSessionsState(state)
    await removeLegacyKeys()
    return state
  }
  const fresh = emptyState()
  await persistTerminalSessionsState(fresh)
  return fresh
}

export async function persistTerminalSessionsState(
  state: TerminalSessionsStateV1
): Promise<void> {
  const normalized = ensureActiveInOrder(state)
  const body: StoredSessionsBodyV5 = {
    v: 5,
    logsById: normalized.logsById,
    order: [...normalized.order],
    activeId: normalized.activeId,
    namesById: { ...normalized.namesById }
  }
  await chrome.storage.local.set({ [TERMINAL_SESSIONS_KEY]: body })
}

async function readFreshSessionsOrEnsure(): Promise<TerminalSessionsStateV1> {
  await ensureTerminalSessionsState()
  const s = await readTerminalSessionsIfPresent()
  if (s) {
    return s
  }
  return ensureTerminalSessionsState()
}

export async function appendLinesToSession(
  sessionId: string,
  newLines: string[]
): Promise<void> {
  const fresh = await readFreshSessionsOrEnsure()
  const id = resolveSessionId(fresh, sessionId)
  const prev = fresh.logsById[id] ?? []
  const merged = trimSessionLog([...prev, ...newLines])
  await persistTerminalSessionsState({
    ...fresh,
    logsById: { ...fresh.logsById, [id]: merged }
  })
}

export async function setSessionLines(sessionId: string, lines: string[]): Promise<void> {
  const fresh = await readFreshSessionsOrEnsure()
  const id = resolveSessionId(fresh, sessionId)
  await persistTerminalSessionsState({
    ...fresh,
    logsById: { ...fresh.logsById, [id]: trimSessionLog(lines) }
  })
}

export async function clearSessionLines(sessionId: string): Promise<void> {
  await setSessionLines(sessionId, [])
}

export async function removeAllTerminalSessionsFromStorage(): Promise<void> {
  await chrome.storage.local.remove([
    TERMINAL_SESSIONS_KEY,
    SPLIT_LAYOUT_KEY,
    ACTIVE_TERMINAL_SESSION_KEY,
    SESSION_LOG_KEY,
    LEGACY_SPLIT_KEY,
    PROCESS_UI_STATE_KEY,
    TAB_PICKER_FOLD_STATE_KEY
  ])
  await clearTabPickerFoldStateStorage()
  await clearProcessUiStateStorage()
}

export async function resetBmxtTerminalSessionsInStorage(): Promise<void> {
  await chrome.storage.local.remove([
    ACTIVE_TERMINAL_SESSION_KEY,
    SESSION_LOG_KEY,
    LEGACY_SPLIT_KEY,
    SPLIT_LAYOUT_KEY,
    PROCESS_UI_STATE_KEY,
    TAB_PICKER_FOLD_STATE_KEY,
    CMD_HISTORY_KEY,
    TERMINAL_SESSIONS_KEY
  ])
  await clearTabPickerFoldStateStorage()
  await clearProcessUiStateStorage()
  await removeLegacyTerminalStorageKeys()
}

export async function setActiveSession(
  sessionId: string
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readTerminalSessionsIfPresent()
  if (!fresh || !fresh.order.includes(sessionId)) {
    return null
  }
  const next: TerminalSessionsStateV1 = { ...fresh, activeId: sessionId }
  await persistTerminalSessionsState(next)
  return next
}

function adjacentSessionId(
  order: readonly string[],
  currentId: string,
  delta: number
): string | null {
  if (order.length <= 1) {
    return null
  }
  const idx = order.indexOf(currentId)
  const from = idx >= 0 ? idx : 0
  const next = (from + delta + order.length) % order.length
  return order[next] ?? null
}

function pickersFromStoredLeaf(
  leaf: NonNullable<Awaited<ReturnType<typeof readProcessUiStateFromStorage>>>["byLeaf"][string]
): SessionPickerState | undefined {
  if (!leaf) {
    return undefined
  }
  const p = leaf.pickers
  return {
    tabs: p.tabs
      ? {
          showUrl: p.tabs.showUrl,
          interactive: p.tabs.interactive,
          rows: [],
          initialHi: 0
        }
      : null,
    search: p.search,
    dom: p.dom,
    setting: null
  }
}

async function resolveNewSessionName(
  fromSessionId: string,
  fresh: TerminalSessionsStateV1,
  explicitName: string | undefined
): Promise<string> {
  const sanitized = explicitName !== undefined ? sanitizeSessionName(explicitName) : null
  if (sanitized) {
    return sanitized
  }
  const processUi = await readProcessUiStateFromStorage()
  const leaf = processUi?.byLeaf[fromSessionId]
  const pickers = leaf ? pickersFromStoredLeaf(leaf) : undefined
  const navArmed = leaf?.navArmed ?? false
  const logs = fresh.logsById[fromSessionId] ?? []
  return deriveDefaultSessionName({
    pickers,
    navArmed,
    logs,
    fallbackIndex: fresh.order.length + 1
  })
}

export async function createSessionAndActivate(
  fromSessionId: string,
  options?: { name?: string }
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  const newId = newSessionId()
  const sessionName = await resolveNewSessionName(fromSessionId, fresh, options?.name)
  await persistTerminalSessionsState({
    ...fresh,
    logsById: { ...fresh.logsById, [newId]: [] },
    order: [...fresh.order, newId],
    activeId: newId,
    namesById: { ...fresh.namesById, [newId]: sessionName }
  })
  return readTerminalSessionsIfPresent()
}

export async function setSessionDisplayName(
  sessionId: string,
  name: string
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  if (!fresh.order.includes(sessionId)) {
    return null
  }
  await persistTerminalSessionsState({
    ...fresh,
    namesById: { ...fresh.namesById, [sessionId]: name }
  })
  return readTerminalSessionsIfPresent()
}

export async function switchSessionNext(
  currentSessionId: string
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  const nextId = adjacentSessionId(fresh.order, fresh.activeId || currentSessionId, 1)
  if (!nextId) {
    return fresh
  }
  return setActiveSession(nextId)
}

export async function switchSessionPrev(
  currentSessionId: string
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  const prevId = adjacentSessionId(fresh.order, fresh.activeId || currentSessionId, -1)
  if (!prevId) {
    return fresh
  }
  return setActiveSession(prevId)
}

export type ExitOrCloseResult =
  | { fullClose: true }
  | { fullClose: false; activeIdAfter: string }

export async function exitOrCloseSessionInStorage(sessionId: string): Promise<ExitOrCloseResult> {
  const fresh = await readFreshSessionsOrEnsure()
  if (fresh.order.length <= 1) {
    await removeAllTerminalSessionsFromStorage()
    return { fullClose: true }
  }
  const newOrder = fresh.order.filter((id) => id !== sessionId)
  if (newOrder.length === 0) {
    await removeAllTerminalSessionsFromStorage()
    return { fullClose: true }
  }
  const { [sessionId]: _removedLog, ...restLogs } = fresh.logsById
  const { [sessionId]: _removedName, ...restNames } = fresh.namesById
  const closedIdx = fresh.order.indexOf(sessionId)
  let activeId = fresh.activeId
  if (activeId === sessionId) {
    const pick = newOrder[Math.min(closedIdx, newOrder.length - 1)] ?? newOrder[0]
    activeId = pick
  }
  await persistTerminalSessionsState({
    ...fresh,
    logsById: restLogs,
    namesById: restNames,
    order: newOrder,
    activeId
  })
  return { fullClose: false, activeIdAfter: activeId }
}
