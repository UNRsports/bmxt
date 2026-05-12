import {
  ACTIVE_TERMINAL_SESSION_KEY,
  MAX_SESSION_LOG_LINES,
  SESSION_LOG_KEY,
  TERMINAL_SESSIONS_KEY
} from "../../extension-storage/keys"
import type { TerminalSessionsStateV1 } from "./types"

/** 旧マルチペインセッションキー（移行のみ）。 */
const LEGACY_SPLIT_KEY = "bmxt_split_session"

type LegacySplitSession = {
  v: 1
  paneLogs: Record<string, string[]>
  focusedPaneId: string
}

/** `TERMINAL_SESSIONS_KEY` に保存する本体（activeId は別キー）。 */
type StoredSessionsBodyV2 = {
  v: 2
  logsById: Record<string, string[]>
  order: string[]
}

function trimLog(lines: string[]): string[] {
  return lines.slice(-MAX_SESSION_LOG_LINES)
}

function newSessionId(): string {
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
    order: [id],
    activeId: id
  }
}

/** ストレージ上の旧形式（1 キーに activeId まで含む）。 */
function isCombinedV1Stored(x: unknown): x is TerminalSessionsStateV1 {
  if (!x || typeof x !== "object") {
    return false
  }
  const o = x as TerminalSessionsStateV1
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

async function migrateV1StoredToV2(s: TerminalSessionsStateV1): Promise<void> {
  const body: StoredSessionsBodyV2 = { v: 2, logsById: s.logsById, order: s.order }
  await chrome.storage.local.set({
    [TERMINAL_SESSIONS_KEY]: body,
    [ACTIVE_TERMINAL_SESSION_KEY]: s.activeId
  })
}

/**
 * 単一キーの変更イベント用。v2 本体だけでは active が分からないので null を返し得る。
 */
export function terminalSessionsStateFromUnknown(
  x: unknown
): TerminalSessionsStateV1 | null {
  return isCombinedV1Stored(x) ? x : null
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

/**
 * ストレージに保存済みの状態のみ返す（無ければ null）。v1 単一ブロブは読み込み時に v2+active へ移行する。
 */
export async function readTerminalSessionsIfPresent(): Promise<TerminalSessionsStateV1 | null> {
  const r = await chrome.storage.local.get([
    TERMINAL_SESSIONS_KEY,
    ACTIVE_TERMINAL_SESSION_KEY
  ])
  const raw = r[TERMINAL_SESSIONS_KEY]
  const activeRaw = r[ACTIVE_TERMINAL_SESSION_KEY]

  if (isBodyV2Stored(raw)) {
    const activeId =
      typeof activeRaw === "string" && raw.order.includes(activeRaw)
        ? activeRaw
        : raw.order[0]
    return {
      v: 1,
      logsById: raw.logsById,
      order: [...raw.order],
      activeId
    }
  }

  if (isCombinedV1Stored(raw)) {
    await migrateV1StoredToV2(raw)
    return {
      v: 1,
      logsById: { ...raw.logsById },
      order: [...raw.order],
      activeId: raw.activeId
    }
  }

  return null
}

/**
 * 有効な `TerminalSessionsStateV1` を返す。未移行データがあれば移行し、無ければ空の 1 セッションを生成する。
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
      order: [id],
      activeId: id
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
  const body: StoredSessionsBodyV2 = {
    v: 2,
    logsById: state.logsById,
    order: state.order
  }
  await chrome.storage.local.set({
    [TERMINAL_SESSIONS_KEY]: body,
    [ACTIVE_TERMINAL_SESSION_KEY]: state.activeId
  })
}

export function resolveSessionId(
  state: TerminalSessionsStateV1,
  requested: string | undefined
): string {
  if (requested && state.order.includes(requested)) {
    return requested
  }
  return state.activeId
}

/**
 * 書き込み直前に使う最新スナップショット。
 */
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
    order: [...fresh.order],
    activeId: fresh.activeId,
    logsById: { ...fresh.logsById, [id]: merged }
  })
}

export async function setSessionLines(sessionId: string, lines: string[]): Promise<void> {
  const fresh = await readFreshSessionsOrEnsure()
  const id = resolveSessionId(fresh, sessionId)
  await persistTerminalSessionsState({
    v: 1,
    order: [...fresh.order],
    activeId: fresh.activeId,
    logsById: { ...fresh.logsById, [id]: trimLog(lines) }
  })
}

export async function clearSessionLines(sessionId: string): Promise<void> {
  await setSessionLines(sessionId, [])
}

/** ストレージ上のターミナル状態を消去（BMXt 終了時など）。 */
export async function removeAllTerminalSessionsFromStorage(): Promise<void> {
  await chrome.storage.local.remove([
    TERMINAL_SESSIONS_KEY,
    ACTIVE_TERMINAL_SESSION_KEY,
    SESSION_LOG_KEY,
    LEGACY_SPLIT_KEY
  ])
}

/**
 * フォーカス中セッションのみ更新。ログ本体キーを触らないため、追記処理と競合しない。
 */
export async function setActiveSession(sessionId: string): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readTerminalSessionsIfPresent()
  if (!fresh || !fresh.order.includes(sessionId)) {
    return null
  }
  await chrome.storage.local.set({ [ACTIVE_TERMINAL_SESSION_KEY]: sessionId })
  return { ...fresh, activeId: sessionId }
}

export async function addTerminalSession(): Promise<TerminalSessionsStateV1> {
  const fresh = await readFreshSessionsOrEnsure()
  const id = newSessionId()
  const next: TerminalSessionsStateV1 = {
    v: 1,
    logsById: { ...fresh.logsById, [id]: [] },
    order: [...fresh.order, id],
    activeId: id
  }
  await persistTerminalSessionsState(next)
  return next
}

function removeSessionFromState(
  state: TerminalSessionsStateV1,
  sessionId: string
): TerminalSessionsStateV1 {
  const order = state.order.filter((x) => x !== sessionId)
  const { [sessionId]: _removed, ...rest } = state.logsById
  let activeId = state.activeId
  if (!order.includes(activeId)) {
    activeId = order[0] ?? state.activeId
  }
  return {
    v: 1,
    logsById: rest,
    order,
    activeId
  }
}

/** UI からセッションを閉じる（最後の 1 つは閉じない）。 */
export async function closeTerminalSessionUi(sessionId: string): Promise<TerminalSessionsStateV1 | null> {
  const fresh = await readTerminalSessionsIfPresent()
  if (!fresh || fresh.order.length <= 1 || !fresh.order.includes(sessionId)) {
    return null
  }
  const next = removeSessionFromState(fresh, sessionId)
  await persistTerminalSessionsState(next)
  return next
}

export type ExitOrCloseResult =
  | { fullClose: true }
  | { fullClose: false; activeIdAfter: string }

/**
 * `exit` / exit_pane: 最後のセッションならストレージ掃除＋ウィンドウは呼び出し側で閉じる。複数あれば当該セッションのみ削除。
 */
export async function exitOrCloseSessionInStorage(sessionId: string): Promise<ExitOrCloseResult> {
  const fresh = await readFreshSessionsOrEnsure()
  if (fresh.order.length <= 1) {
    await removeAllTerminalSessionsFromStorage()
    return { fullClose: true }
  }
  const next = removeSessionFromState(fresh, sessionId)
  await persistTerminalSessionsState(next)
  return { fullClose: false, activeIdAfter: next.activeId }
}
