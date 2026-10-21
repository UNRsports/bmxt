/**
 * EN: Load heavy background services from a separate bundle (not inlined into background.js).
 *     Chrome MV3 service worker: `importScripts` + IIFE global.
 *     Firefox MV3 background scripts: no `importScripts` → dynamic `import()` of ESM.
 * JA: 重い background 処理を別バンドルから読み込む（background.js にインライン化しない）。
 *     Chrome MV3 SW: importScripts + IIFE。
 *     Firefox MV3: importScripts なし → ESM を dynamic import。
 */

import type { RunCmdResult } from "../../lib/features/bmxt-window/terminal-sessions/session-patches"

export type BackgroundServicesModule = {
  registerBackgroundServices(): void
  runCommandMessage(
    line: string,
    sessionId?: string,
    sessionOrderLength?: number,
    sender?: chrome.runtime.MessageSender,
    locale?: string,
    hostKind?: unknown
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
      `${BACKGROUND_SERVICES_GLOBAL} global missing after loading background-services`
    )
  }
  return mod as BackgroundServicesModule
}

function hasBackgroundServicesGlobal(): boolean {
  const mod = (globalThis as Record<string, unknown>)[BACKGROUND_SERVICES_GLOBAL]
  return !!mod && typeof mod === "object"
}

async function loadBackgroundServicesScript(): Promise<void> {
  if (hasBackgroundServicesGlobal()) {
    return
  }

  if (typeof importScripts === "function") {
    const iifeUrl = chrome.runtime.getURL("background-services.js")
    importScripts(iifeUrl)
    return
  }

  // Firefox (and any non-SW background): ESM + dynamic import.
  // @vite-ignore — URL is extension-runtime, not a Vite-bundled module graph edge.
  const esmUrl = chrome.runtime.getURL("background-services.mjs")
  await import(/* @vite-ignore */ esmUrl)
}

export function loadBackgroundServicesAsync(): Promise<BackgroundServicesModule> {
  if (!servicesPromise) {
    servicesPromise = loadBackgroundServicesScript()
      .then(() => readBackgroundServicesModule())
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
