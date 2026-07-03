/**
 * EN: Load heavy SW services from a separate bundle (not inlined into background.js).
 * JA: 重い SW 処理を別バンドルから読み込む（background.js にインライン化しない）。
 *
 * Service workers cannot use dynamic import(); use importScripts() + IIFE global instead.
 */

import type { RunCmdResult } from "../../lib/features/bmxt-window/terminal-sessions/session-patches"

export type BackgroundServicesModule = {
  registerBackgroundServices(): void
  runCommandMessage(
    line: string,
    sessionId?: string,
    sessionOrderLength?: number,
    sender?: chrome.runtime.MessageSender,
    locale?: string
  ): Promise<RunCmdResult>
  runNavControlMessage(message: Record<string, unknown>): Promise<unknown>
  removeAllTerminalSessionsFromStorageAsync(): Promise<void>
  resetBmxtFromShortcutAsync(openOrFocus: () => Promise<void>): Promise<void>
}

const BACKGROUND_SERVICES_GLOBAL = "BmxtBackgroundServices"

let servicesPromise: Promise<BackgroundServicesModule> | undefined

function readBackgroundServicesModule(): BackgroundServicesModule {
  const mod = (globalThis as Record<string, unknown>)[BACKGROUND_SERVICES_GLOBAL]
  if (!mod || typeof mod !== "object") {
    throw new Error(
      `${BACKGROUND_SERVICES_GLOBAL} global missing after importScripts(background-services.js)`
    )
  }
  return mod as BackgroundServicesModule
}

export function loadBackgroundServicesAsync(): Promise<BackgroundServicesModule> {
  if (!servicesPromise) {
    servicesPromise = Promise.resolve()
      .then(() => {
        const url = chrome.runtime.getURL("background-services.js")
        importScripts(url)
        return readBackgroundServicesModule()
      })
      .catch((error) => {
        servicesPromise = undefined
        throw error
      })
  }
  return servicesPromise
}

export function resetBackgroundServicesForTests(): void {
  servicesPromise = undefined
}
