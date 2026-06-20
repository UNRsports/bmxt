import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types"
import { getSessionLogCache, invalidateSessionLogCache, setSessionLogCache } from "./cache"
import { isSessionLogServiceWorkerContext } from "./context"
import {
  SESSION_LOG_APPEND,
  SESSION_LOG_SET,
  SESSION_STATE_SYNC
} from "./messages"
import { flushSessionLogPersist, scheduleSessionLogPersist } from "./persist"
import { pushSessionLogMessage } from "./push"
import { trimSessionLogLines } from "./trim"

export type SessionLogCommitOptions = {
  /** EN: Replay from SW push — update UI only, do not persist or re-push. */
  replay?: boolean
  /** EN: Force immediate disk write (structural / exit). */
  flushPersist?: boolean
}

function appendLinesToState(
  state: TerminalSessionsStateV1,
  sessionId: string,
  newLines: string[]
): TerminalSessionsStateV1 {
  const prev = state.logsById[sessionId] ?? []
  return {
    ...state,
    logsById: {
      ...state.logsById,
      [sessionId]: trimSessionLogLines([...prev, ...newLines])
    }
  }
}

function setLinesOnState(
  state: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[]
): TerminalSessionsStateV1 {
  return {
    ...state,
    logsById: {
      ...state.logsById,
      [sessionId]: trimSessionLogLines(lines)
    }
  }
}

export function seedSessionLogCache(state: TerminalSessionsStateV1): void {
  if (!getSessionLogCache()) {
    setSessionLogCache(state)
  }
}

export async function commitSessionLogState(
  next: TerminalSessionsStateV1,
  options: SessionLogCommitOptions = {}
): Promise<void> {
  setSessionLogCache(next)
  if (options.replay) {
    return
  }
  if (isSessionLogServiceWorkerContext()) {
    pushSessionLogMessage({ type: SESSION_STATE_SYNC, state: next })
  }
  if (options.flushPersist) {
    await flushSessionLogPersist()
    return
  }
  scheduleSessionLogPersist()
}

export async function commitSessionLogAppend(
  next: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[],
  options: SessionLogCommitOptions = {}
): Promise<void> {
  setSessionLogCache(next)
  if (options.replay) {
    return
  }
  if (isSessionLogServiceWorkerContext()) {
    pushSessionLogMessage({ type: SESSION_LOG_APPEND, sessionId, lines })
  }
  if (options.flushPersist) {
    await flushSessionLogPersist()
    return
  }
  scheduleSessionLogPersist()
}

export async function commitSessionLogSet(
  next: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[],
  options: SessionLogCommitOptions = {}
): Promise<void> {
  setSessionLogCache(next)
  if (options.replay) {
    return
  }
  if (isSessionLogServiceWorkerContext()) {
    pushSessionLogMessage({ type: SESSION_LOG_SET, sessionId, lines: trimSessionLogLines(lines) })
  }
  if (options.flushPersist) {
    await flushSessionLogPersist()
    return
  }
  scheduleSessionLogPersist()
}

export async function commitSessionLogCleared(): Promise<void> {
  invalidateSessionLogCache()
  if (isSessionLogServiceWorkerContext()) {
    pushSessionLogMessage({ type: SESSION_STATE_SYNC, state: null })
  }
}

export function applyReplayedSessionLogAppend(
  state: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[]
): TerminalSessionsStateV1 {
  return appendLinesToState(state, sessionId, lines)
}

export function applyReplayedSessionLogSet(
  state: TerminalSessionsStateV1,
  sessionId: string,
  lines: string[]
): TerminalSessionsStateV1 {
  return setLinesOnState(state, sessionId, lines)
}

export { appendLinesToState, setLinesOnState }
