/** EN: SW → BMXt UI tab — immediate log display without waiting for storage.onChanged. */

export const SESSION_LOG_APPEND = "SESSION_LOG_APPEND" as const
export const SESSION_LOG_SET = "SESSION_LOG_SET" as const
export const SESSION_STATE_SYNC = "SESSION_STATE_SYNC" as const

export type SessionLogAppendMessage = {
  type: typeof SESSION_LOG_APPEND
  sessionId: string
  lines: string[]
}

export type SessionLogSetMessage = {
  type: typeof SESSION_LOG_SET
  sessionId: string
  lines: string[]
}

export type SessionStateSyncMessage = {
  type: typeof SESSION_STATE_SYNC
  /** EN: Omitted when sessions were cleared (e.g. window close). */
  state: import("../bmxt-window/terminal-sessions/types").TerminalSessionsStateV1 | null
}

export type SessionLogMessage =
  | SessionLogAppendMessage
  | SessionLogSetMessage
  | SessionStateSyncMessage

export function isSessionLogMessage(raw: unknown): raw is SessionLogMessage {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const t = (raw as { type?: unknown }).type
  return t === SESSION_LOG_APPEND || t === SESSION_LOG_SET || t === SESSION_STATE_SYNC
}
