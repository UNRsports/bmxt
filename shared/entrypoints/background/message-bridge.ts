/**
 * EN: Always-on RUN_CMD / NAV_CONTROL bridge while background-services.js loads.
 *     Privileged messages: same-extension `bmxt.html` / `bmxt-float.html` only
 *     (`chrome-extension:` / `moz-extension:` via extension-url + trusted-ui-sender).
 * JA: background-services 読込中も RUN_CMD / NAV_CONTROL を受け付ける。
 *     特権メッセージは同一拡張の bmxt.html / bmxt-float.html のみ（拡張 URL ヘルパ）。
 */

import { isTrustedBmxtUiSender } from "../../lib/features/extension-permissions/trusted-ui-sender"
import { loadBackgroundServicesAsync } from "./load-background-services"

type RunCmdMessage = {
  type?: string
  line?: string
  sessionId?: string
  sessionOrderLength?: number
  locale?: string
  hostKind?: string
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
      if (message?.type === "RUN_CMD" && typeof message.line === "string") {
        if (!isTrustedBmxtUiSender(sender)) {
          safeSendResponse(sendResponse, {
            ok: false,
            error: "untrusted sender"
          })
          return true
        }
        void withBackgroundServices((services) =>
          services.runCommandMessage(
            message.line!,
            message.sessionId,
            message.sessionOrderLength,
            sender,
            message.locale,
            message.hostKind
          )
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
      if (message?.type === "NAV_CONTROL" && typeof message.tabId === "number") {
        if (!isTrustedBmxtUiSender(sender)) {
          safeSendResponse(sendResponse, {
            ok: false,
            reason: "untrusted-sender"
          })
          return true
        }
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
