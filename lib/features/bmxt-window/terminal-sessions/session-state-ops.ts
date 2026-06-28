/**
 * EN: Pure terminal session state transforms (UI is source of truth).
 * JA: ターミナルセッション状態の純粋変換（正本は UI）。
 */

import { MAX_SESSION_LOG_LINES } from "../../extension-storage/keys"
import { sanitizeSessionName } from "../../session/session-summary"
import type { TerminalSessionsStateV1 } from "./types"

export function trimSessionLog(lines: string[]): string[] {
  return lines.slice(-MAX_SESSION_LOG_LINES)
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function createEmptyTerminalSessionsState(): TerminalSessionsStateV1 {
  const id = newSessionId()
  return {
    v: 2,
    logsById: { [id]: [] },
    order: [id],
    activeId: id,
    namesById: {}
  }
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

function ensureActiveInOrder(state: TerminalSessionsStateV1): TerminalSessionsStateV1 {
  if (state.order.length === 0) {
    return createEmptyTerminalSessionsState()
  }
  if (state.order.includes(state.activeId)) {
    return state
  }
  return { ...state, activeId: state.order[0]! }
}

export function appendLinesToSessionState(
  state: TerminalSessionsStateV1,
  sessionId: string,
  newLines: string[]
): TerminalSessionsStateV1 {
  const normalized = ensureActiveInOrder(state)
  const id = resolveSessionId(normalized, sessionId)
  const prev = normalized.logsById[id] ?? []
  return {
    ...normalized,
    logsById: {
      ...normalized.logsById,
      [id]: trimSessionLog([...prev, ...newLines])
    }
  }
}

export function setSessionLinesState(
  state: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[]
): TerminalSessionsStateV1 {
  const normalized = ensureActiveInOrder(state)
  const id = resolveSessionId(normalized, sessionId)
  return {
    ...normalized,
    logsById: {
      ...normalized.logsById,
      [id]: trimSessionLog(lines)
    }
  }
}

export function setActiveSessionState(
  state: TerminalSessionsStateV1,
  sessionId: string
): TerminalSessionsStateV1 | null {
  if (!state.order.includes(sessionId)) {
    return null
  }
  return { ...state, activeId: sessionId }
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

export function switchSessionNextState(
  state: TerminalSessionsStateV1,
  anchorSessionId: string
): TerminalSessionsStateV1 {
  const nextId = adjacentSessionId(state.order, state.activeId || anchorSessionId, 1)
  if (!nextId) {
    return state
  }
  return { ...state, activeId: nextId }
}

export function switchSessionPrevState(
  state: TerminalSessionsStateV1,
  anchorSessionId: string
): TerminalSessionsStateV1 {
  const prevId = adjacentSessionId(state.order, state.activeId || anchorSessionId, -1)
  if (!prevId) {
    return state
  }
  return { ...state, activeId: prevId }
}

export function setSessionDisplayNameState(
  state: TerminalSessionsStateV1,
  sessionId: string,
  name: string
): TerminalSessionsStateV1 | null {
  if (!state.order.includes(sessionId)) {
    return null
  }
  return {
    ...state,
    namesById: { ...state.namesById, [sessionId]: name }
  }
}

export function createSessionAndActivateState(
  state: TerminalSessionsStateV1,
  fromSessionId: string,
  sessionName: string
): TerminalSessionsStateV1 {
  const newId = newSessionId()
  return {
    ...state,
    logsById: { ...state.logsById, [newId]: [] },
    order: [...state.order, newId],
    activeId: newId,
    namesById: { ...state.namesById, [newId]: sessionName }
  }
}

export function resolveExplicitOrSanitizedSessionName(rawName: string | undefined): string | null {
  if (rawName === undefined) {
    return null
  }
  const trimmed = rawName.trim()
  if (trimmed.length === 0) {
    return null
  }
  return sanitizeSessionName(trimmed)
}

export type ExitSessionResult =
  | { fullClose: true; state: TerminalSessionsStateV1 }
  | { fullClose: false; state: TerminalSessionsStateV1; activeIdAfter: string }

export function exitSessionState(
  state: TerminalSessionsStateV1,
  sessionId: string
): ExitSessionResult {
  if (state.order.length <= 1) {
    return { fullClose: true, state: createEmptyTerminalSessionsState() }
  }
  const newOrder = state.order.filter((id) => id !== sessionId)
  if (newOrder.length === 0) {
    return { fullClose: true, state: createEmptyTerminalSessionsState() }
  }
  const { [sessionId]: _removedLog, ...restLogs } = state.logsById
  const { [sessionId]: _removedName, ...restNames } = state.namesById
  const closedIdx = state.order.indexOf(sessionId)
  let activeId = state.activeId
  if (activeId === sessionId) {
    const pick = newOrder[Math.min(closedIdx, newOrder.length - 1)] ?? newOrder[0]
    activeId = pick!
  }
  const next: TerminalSessionsStateV1 = {
    ...state,
    logsById: restLogs,
    namesById: restNames,
    order: newOrder,
    activeId
  }
  return { fullClose: false, state: next, activeIdAfter: activeId }
}
