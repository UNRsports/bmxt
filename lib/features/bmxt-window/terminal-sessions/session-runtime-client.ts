/**
 * EN: BMXt UI → SW session mutations (logs/metadata stay in SW memory).
 * JA: BMXt UI から SW セッション状態へ送るメッセージ。
 */

import {
  SESSION_INIT_MESSAGE,
  SESSION_UI_APPEND_LOG_MESSAGE,
  SESSION_UI_SET_ACTIVE_MESSAGE,
  SESSION_UI_SET_NAME_MESSAGE,
  type SessionInitResponse
} from "./session-runtime-protocol"
import type { TerminalSessionsStateV1 } from "./types"

function sendRuntimeMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(response)
    })
  })
}

export async function initSessionRuntimeFromPageAsync(): Promise<TerminalSessionsStateV1> {
  const response = await sendRuntimeMessage<SessionInitResponse>({
    type: SESSION_INIT_MESSAGE
  })
  if (!response || typeof response !== "object" || !("ok" in response) || response.ok !== true) {
    const msg =
      response && typeof response === "object" && "error" in response && typeof response.error === "string"
        ? response.error
        : "SESSION_INIT failed"
    throw new Error(msg)
  }
  return response.state
}

export async function appendSessionLogFromUiAsync(
  sessionId: string,
  lines: string[]
): Promise<void> {
  if (lines.length === 0) {
    return
  }
  await sendRuntimeMessage<{ ok: boolean }>({
    type: SESSION_UI_APPEND_LOG_MESSAGE,
    sessionId,
    lines
  })
}

export async function setActiveSessionFromUiAsync(sessionId: string): Promise<void> {
  await sendRuntimeMessage<{ ok: boolean }>({
    type: SESSION_UI_SET_ACTIVE_MESSAGE,
    sessionId
  })
}

export async function setSessionNameFromUiAsync(sessionId: string, name: string): Promise<void> {
  await sendRuntimeMessage<{ ok: boolean }>({
    type: SESSION_UI_SET_NAME_MESSAGE,
    sessionId,
    name
  })
}
