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
import { clearProcessUiStateStorage } from "../process-ui-state-storage"
import { clearTabPickerFoldStateStorage } from "../../tabs/tab-picker-fold-state"
import {
  colChainFromLeafIds,
  containsLeaf,
  countLeaves,
  listLeafIds,
  removeLeafFromTree,
  singleLeafLayout,
  splitColAtLeaf,
  splitRowAtLeaf,
  ensureFocusedInTree,
  isValidLayout
} from "../split-layout/tree"
import type { SplitLayoutV1 } from "../split-layout/types"
import type { TerminalSessionsStateV1 } from "./types"

/** 旧マルチペインセッションキー（移行のみ）。 */
const LEGACY_SPLIT_KEY = "bmxt_split_session"

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

function trimLog(lines: string[]): string[] {
  return lines.slice(-MAX_SESSION_LOG_LINES)
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function emptyState(): TerminalSessionsStateV1 {
  const id = newSessionId()
  return {
    v: 1,
    logsById: { [id]: [] },
    layout: singleLeafLayout(id)
  }
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

async function legacyLinesFromSplitOrLog(): Promise<string[] | null> {
  const r = await chrome.storage.local.get([SESSION_LOG_KEY, LEGACY_SPLIT_KEY])
  if (Array.isArray(r[SESSION_LOG_KEY])) {
    return trimLog(r[SESSION_LOG_KEY] as string[])
  }
  const legacy = r[LEGACY_SPLIT_KEY] as LegacySplitSession | undefined
  if (legacy && legacy.v === 1 && legacy.paneLogs && legacy.focusedPaneId) {
    const lines = legacy.paneLogs[legacy.focusedPaneId] ?? []
    return trimLog(lines)
  }
  return null
}

async function removeLegacyKeys(): Promise<void> {
  await chrome.storage.local.remove([SESSION_LOG_KEY, LEGACY_SPLIT_KEY])
}

function inferLayoutFromLogs(logsById: Record<string, string[]>): SplitLayoutV1 {
  const keys = Object.keys(logsById).sort()
  if (keys.length === 0) {
    const id = newSessionId()
    return singleLeafLayout(id)
  }
  const focus = keys[0]
  return {
    v: 1,
    root: colChainFromLeafIds(keys),
    focusedLeafId: focus
  }
}

async function migrateStorageShapes(): Promise<void> {
  const r = await chrome.storage.local.get([
    TERMINAL_SESSIONS_KEY,
    SPLIT_LAYOUT_KEY,
    ACTIVE_TERMINAL_SESSION_KEY
  ])
  const raw = r[TERMINAL_SESSIONS_KEY]
  const layoutRaw = r[SPLIT_LAYOUT_KEY]

  if (isBodyV2Stored(raw)) {
    const activeRaw = r[ACTIVE_TERMINAL_SESSION_KEY]
    const activeId =
      typeof activeRaw === "string" && raw.order.includes(activeRaw)
        ? activeRaw
        : raw.order[0]
    const layout: SplitLayoutV1 = {
      v: 1,
      root: colChainFromLeafIds([...raw.order]),
      focusedLeafId: activeId
    }
    const body: StoredLogsV3 = { v: 3, logsById: raw.logsById }
    await chrome.storage.local.set({
      [TERMINAL_SESSIONS_KEY]: body,
      [SPLIT_LAYOUT_KEY]: layout
    })
    await chrome.storage.local.remove(ACTIVE_TERMINAL_SESSION_KEY)
    return
  }

  if (isCombinedV1Stored(raw)) {
    const layout: SplitLayoutV1 = {
      v: 1,
      root: colChainFromLeafIds([...raw.order]),
      focusedLeafId: raw.activeId
    }
    const body: StoredLogsV3 = { v: 3, logsById: raw.logsById }
    await chrome.storage.local.set({
      [TERMINAL_SESSIONS_KEY]: body,
      [SPLIT_LAYOUT_KEY]: layout
    })
    await chrome.storage.local.remove(ACTIVE_TERMINAL_SESSION_KEY)
    return
  }

  if (isBodyV3Stored(raw) && !isValidLayout(layoutRaw)) {
    const layout = inferLayoutFromLogs(raw.logsById)
    await chrome.storage.local.set({ [SPLIT_LAYOUT_KEY]: layout })
  }
}

/**
 * 単一キーの変更イベント用（v2 ブロブのみのとき）。
 */
export function terminalSessionsStateFromUnknown(
  x: unknown
): TerminalSessionsStateV1 | null {
  return null
}

/**
 * ストレージに保存済みの状態のみ返す（無ければ null）。
 */
export async function readTerminalSessionsIfPresent(): Promise<TerminalSessionsStateV1 | null> {
  await migrateStorageShapes()
  const r = await chrome.storage.local.get([TERMINAL_SESSIONS_KEY, SPLIT_LAYOUT_KEY])
  const rawLogs = r[TERMINAL_SESSIONS_KEY]
  const rawLayout = r[SPLIT_LAYOUT_KEY]
  if (!isBodyV3Stored(rawLogs) || !isValidLayout(rawLayout)) {
    return null
  }
  const layout = ensureFocusedInTree(rawLayout)
  return {
    v: 1,
    logsById: rawLogs.logsById,
    layout
  }
}

/**
 * 有効な状態を返す。未移行データがあれば移行し、無ければ空の 1 リーフを生成する。
 */
export async function ensureTerminalSessionsState(): Promise<TerminalSessionsStateV1> {
  const cur = await readTerminalSessionsIfPresent()
  if (cur) {
    return cur
  }
  const migrated = await legacyLinesFromSplitOrLog()
  if (migrated !== null) {
    const id = newSessionId()
    const state: TerminalSessionsStateV1 = {
      v: 1,
      logsById: { [id]: migrated },
      layout: singleLeafLayout(id)
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
  const body: StoredLogsV3 = { v: 3, logsById: state.logsById }
  const layout = ensureFocusedInTree(state.layout)
  await chrome.storage.local.set({
    [TERMINAL_SESSIONS_KEY]: body,
    [SPLIT_LAYOUT_KEY]: layout
  })
}

export function resolveSessionId(
  state: TerminalSessionsStateV1,
  requested: string | undefined
): string {
  if (requested && containsLeaf(state.layout.root, requested)) {
    return requested
  }
  return state.layout.focusedLeafId
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
  const merged = trimLog([...prev, ...newLines])
  await persistTerminalSessionsState({
    v: 1,
    layout: fresh.layout,
    logsById: { ...fresh.logsById, [id]: merged }
  })
}

export async function setSessionLines(sessionId: string, lines: string[]): Promise<void> {
  const fresh = await readFreshSessionsOrEnsure()
  const id = resolveSessionId(fresh, sessionId)
  await persistTerminalSessionsState({
    v: 1,
    layout: fresh.layout,
    logsById: { ...fresh.logsById, [id]: trimLog(lines) }
  })
}

export async function clearSessionLines(sessionId: string): Promise<void> {
  await setSessionLines(sessionId, [])
}

/** ストレージ上のターミナル状態を消去（BMXt プロセス `exit` 全終了時）。コマンド履歴は保持。 */
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

/**
 * ターミナルを初期状態へ戻す（単一ペイン・空ログ）。ウィンドウは閉じない。
 * ショートカット `launch-bmxt` から呼ぶ。キー削除と再生成の間隙を避けるため、
 * セッション本体は上書きし、付随状態のみ除去する。
 */
export async function resetBmxtTerminalSessionsInStorage(): Promise<void> {
  const fresh = emptyState()
  await chrome.storage.local.remove([
    ACTIVE_TERMINAL_SESSION_KEY,
    SESSION_LOG_KEY,
    LEGACY_SPLIT_KEY,
    PROCESS_UI_STATE_KEY,
    TAB_PICKER_FOLD_STATE_KEY,
    CMD_HISTORY_KEY
  ])
  await clearTabPickerFoldStateStorage()
  await clearProcessUiStateStorage()
  await persistTerminalSessionsState(fresh)
}

export async function setFocusedLeafSession(
  sessionId: string
): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readTerminalSessionsIfPresent()
  if (!fresh || !containsLeaf(fresh.layout.root, sessionId)) {
    return null
  }
  const next: TerminalSessionsStateV1 = {
    v: 1,
    logsById: fresh.logsById,
    layout: { ...fresh.layout, focusedLeafId: sessionId }
  }
  await persistTerminalSessionsState(next)
  return next
}

export async function splitColForLeaf(leafId: string): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  if (!containsLeaf(fresh.layout.root, leafId)) {
    return null
  }
  const newId = newSessionId()
  const root = splitColAtLeaf(fresh.layout.root, leafId, newId)
  const layout: SplitLayoutV1 = {
    v: 1,
    root,
    focusedLeafId: newId
  }
  await persistTerminalSessionsState({
    v: 1,
    logsById: { ...fresh.logsById, [newId]: [] },
    layout
  })
  return readTerminalSessionsIfPresent()
}

export async function splitRowForLeaf(leafId: string): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readFreshSessionsOrEnsure()
  if (!containsLeaf(fresh.layout.root, leafId)) {
    return null
  }
  const newId = newSessionId()
  const root = splitRowAtLeaf(fresh.layout.root, leafId, newId)
  const layout: SplitLayoutV1 = {
    v: 1,
    root,
    focusedLeafId: newId
  }
  await persistTerminalSessionsState({
    v: 1,
    logsById: { ...fresh.logsById, [newId]: [] },
    layout
  })
  return readTerminalSessionsIfPresent()
}

export type ExitOrCloseResult =
  | { fullClose: true }
  | { fullClose: false; activeIdAfter: string }

/**
 * `exit` / exit_pane: 最後のリーフならウィンドウ終了。複数なら当該 split のみ閉じる。
 */
export async function exitOrCloseSessionInStorage(sessionId: string): Promise<ExitOrCloseResult> {
  const fresh = await readFreshSessionsOrEnsure()
  if (countLeaves(fresh.layout.root) <= 1) {
    await removeAllTerminalSessionsFromStorage()
    return { fullClose: true }
  }
  const { root, focusHint } = removeLeafFromTree(fresh.layout.root, sessionId)
  if (!root || !focusHint) {
    await removeAllTerminalSessionsFromStorage()
    return { fullClose: true }
  }
  const { [sessionId]: _removed, ...restLogs } = fresh.logsById
  let focus = focusHint
  if (!containsLeaf(root, focus)) {
    focus = listLeafIds(root)[0] ?? focus
  }
  const layout: SplitLayoutV1 = { v: 1, root, focusedLeafId: focus }
  await persistTerminalSessionsState({
    v: 1,
    logsById: restLogs,
    layout
  })
  return { fullClose: false, activeIdAfter: focus }
}
