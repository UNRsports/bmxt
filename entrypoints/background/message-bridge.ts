/**
 * EN: Always-on RUN_CMD / NAV_CONTROL bridge while background-services.js loads.
 * JA: background-services 読込中も RUN_CMD / NAV_CONTROL を受け付ける。
 */

import { loadBackgroundServicesAsync } from "./load-background-services"
import {
  SESSION_INIT_MESSAGE,
  SESSION_UI_APPEND_LOG_MESSAGE,
  SESSION_UI_SET_ACTIVE_MESSAGE,
  SESSION_UI_SET_NAME_MESSAGE
} from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-protocol"

const SESSION_RUNTIME_MESSAGE_TYPES = new Set<string>([
  SESSION_INIT_MESSAGE,
  SESSION_UI_APPEND_LOG_MESSAGE,
  SESSION_UI_SET_ACTIVE_MESSAGE,
  SESSION_UI_SET_NAME_MESSAGE
])

type RunCmdMessage = {
  type?: string
  line?: string
  sessionId?: string
}

type NavControlMessage = {
  type?: string
  tabId?: number
  action?: string
  useCenter?: boolean
  x?: number
  y?: number
  dx?: number
  dy?: number
  key?: string
  code?: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  text?: string
  labelsJson?: string
}

function safeSendResponse(sendResponse: (response: unknown) => void, body: unknown): void {
  try {
    sendResponse(body)
  } catch {
    /* message port may already be closed */
  }
}

function withBackgroundServices<T>(
  run: (services: Awaited<ReturnType<typeof loadBackgroundServicesAsync>>) => Promise<T>
): Promise<T> {
  return loadBackgroundServicesAsync().then((services) => {
    services.registerBackgroundServices()
    return run(services)
  })
}

export function setupMessageBridge(): void {
  chrome.runtime.onMessage.addListener(
    (message: RunCmdMessage & NavControlMessage, sender, sendResponse) => {
      if (
        typeof message?.type === "string" &&
        SESSION_RUNTIME_MESSAGE_TYPES.has(message.type)
      ) {
        void withBackgroundServices((services) =>
          services.handleSessionRuntimeMessageAsync(message as Record<string, unknown>)
        )
          .then((result) => safeSendResponse(sendResponse, result))
          .catch((e) =>
            safeSendResponse(sendResponse, {
              ok: false,
              error: e instanceof Error ? e.message : String(e)
            })
          )
        return true
      }
      if (message?.type === "RUN_CMD" && typeof message.line === "string") {
        void withBackgroundServices((services) =>
          services.runCommandMessage(message.line!, message.sessionId, sender)
        )
          .then(() => safeSendResponse(sendResponse, { ok: true }))
          .catch((e) =>
            safeSendResponse(sendResponse, {
              ok: false,
              error: e instanceof Error ? e.message : String(e)
            })
          )
        return true
      }
      if (message?.type === "NAV_CONTROL" && typeof message.tabId === "number") {
        void withBackgroundServices((services) => services.runNavControlMessage(message))
          .then((result) => safeSendResponse(sendResponse, result))
          .catch((e) =>
            safeSendResponse(sendResponse, {
              ok: false,
              reason: e instanceof Error ? e.message : String(e)
            })
          )
        return true
      }
      return false
    }
  )
}
