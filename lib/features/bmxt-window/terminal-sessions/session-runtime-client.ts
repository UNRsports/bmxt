/**
 * EN: BMXt UI → SW command dispatch (session mutations returned as patches).
 * JA: UI → SW コマンド dispatch（セッション変更は patch で返る）。
 */

import type { UiLocale } from "../../setting/locale"
import type { RunCmdResult } from "./session-patches"

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

export async function runCommandFromUiAsync(
  line: string,
  sessionId: string,
  sessionOrderLength: number,
  locale?: UiLocale
): Promise<RunCmdResult> {
  const message: Record<string, unknown> = {
    type: "RUN_CMD",
    line,
    sessionId,
    sessionOrderLength
  }
  if (locale === "en" || locale === "ja") {
    message.locale = locale
  }
  const response = await sendRuntimeMessage<RunCmdResult>(message)
  if (!response || typeof response !== "object" || !("ok" in response)) {
    return { ok: false, error: "RUN_CMD failed" }
  }
  return response
}
