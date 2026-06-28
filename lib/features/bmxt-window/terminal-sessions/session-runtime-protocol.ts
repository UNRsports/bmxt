/**
 * EN: SW ↔ BMXt UI session sync (UI owns state; SW sends RUN_CMD patches only).
 * JA: セッション正本は UI。SW は RUN_CMD patch と明示クリア通知のみ。
 */

import type { RunCmdResult } from "./session-patches"

export const SESSION_CLEAR_MESSAGE = "SESSION_CLEAR"

export type SessionClearMessage = {
  type: typeof SESSION_CLEAR_MESSAGE
}

export type SessionRuntimeOutboundMessage = SessionClearMessage

export function isSessionRuntimeOutboundMessage(
  message: unknown
): message is SessionRuntimeOutboundMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  return (message as { type?: string }).type === SESSION_CLEAR_MESSAGE
}

export type { RunCmdResult }
