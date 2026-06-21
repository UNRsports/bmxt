/**
 * EN: SW ↔ BMXt UI session sync (in-memory runtime; not chrome.storage.local).
 * JA: セッション状態の SW ↔ UI 同期（メモリ上のみ）。
 */

import type { TerminalSessionsStateV1 } from "./types"

export const SESSION_SNAPSHOT_MESSAGE = "SESSION_SNAPSHOT"
export const SESSION_CLEAR_MESSAGE = "SESSION_CLEAR"
export const SESSION_INIT_MESSAGE = "SESSION_INIT"
export const SESSION_UI_APPEND_LOG_MESSAGE = "SESSION_UI_APPEND_LOG"
export const SESSION_UI_SET_ACTIVE_MESSAGE = "SESSION_UI_SET_ACTIVE"
export const SESSION_UI_SET_NAME_MESSAGE = "SESSION_UI_SET_NAME"

export type SessionSnapshotMessage = {
  type: typeof SESSION_SNAPSHOT_MESSAGE
  state: TerminalSessionsStateV1
}

export type SessionClearMessage = {
  type: typeof SESSION_CLEAR_MESSAGE
}

export type SessionInitMessage = {
  type: typeof SESSION_INIT_MESSAGE
}

export type SessionUiAppendLogMessage = {
  type: typeof SESSION_UI_APPEND_LOG_MESSAGE
  sessionId: string
  lines: string[]
}

export type SessionUiSetActiveMessage = {
  type: typeof SESSION_UI_SET_ACTIVE_MESSAGE
  sessionId: string
}

export type SessionUiSetNameMessage = {
  type: typeof SESSION_UI_SET_NAME_MESSAGE
  sessionId: string
  name: string
}

export type SessionRuntimeOutboundMessage =
  | SessionSnapshotMessage
  | SessionClearMessage

export type SessionRuntimeInboundMessage =
  | SessionInitMessage
  | SessionUiAppendLogMessage
  | SessionUiSetActiveMessage
  | SessionUiSetNameMessage

export type SessionInitResponse =
  | { ok: true; state: TerminalSessionsStateV1 }
  | { ok: false; error?: string }

export function isSessionRuntimeOutboundMessage(
  message: unknown
): message is SessionRuntimeOutboundMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  const type = (message as { type?: string }).type
  return type === SESSION_SNAPSHOT_MESSAGE || type === SESSION_CLEAR_MESSAGE
}
