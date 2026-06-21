/**
 * EN: Load heavy SW services from a separate bundle (not inlined into background.js).
 * JA: 重い SW 処理を別バンドルから読み込む（background.js にインライン化しない）。
 */

export type BackgroundServicesModule = {
  registerBackgroundServices(): void
  runCommandMessage(line: string, sessionId?: string): Promise<void>
  runNavControlMessage(message: Record<string, unknown>): Promise<unknown>
  removeAllTerminalSessionsFromStorageAsync(): Promise<void>
  resetBmxtFromShortcutAsync(openOrFocus: () => Promise<void>): Promise<void>
}

let servicesPromise: Promise<BackgroundServicesModule> | undefined

export function loadBackgroundServicesAsync(): Promise<BackgroundServicesModule> {
  if (!servicesPromise) {
    const url = chrome.runtime.getURL("background-services.js")
    servicesPromise = import(/* @vite-ignore */ url) as Promise<BackgroundServicesModule>
  }
  return servicesPromise
}

export function resetBackgroundServicesForTests(): void {
  servicesPromise = undefined
}
