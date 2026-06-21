/**
 * EN: Always-on RUN_CMD / NAV_CONTROL bridge while background-services.js loads.
 * JA: background-services 読込中も RUN_CMD / NAV_CONTROL を受け付ける。
 */

import { loadBackgroundServicesAsync } from "./load-background-services"

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

export function setupMessageBridge(): void {
  chrome.runtime.onMessage.addListener(
    (message: RunCmdMessage & NavControlMessage, _sender, sendResponse) => {
      if (message?.type === "RUN_CMD" && typeof message.line === "string") {
        void loadBackgroundServicesAsync()
          .then((services) => services.runCommandMessage(message.line!, message.sessionId))
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
        void loadBackgroundServicesAsync()
          .then((services) => services.runNavControlMessage(message))
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
