/**
 * EN: Preferred prompt host for launch-bmxt / toolbar (`popup` | `float`).
 *     Updated by `switchwindow`; defaults to popup.
 * JA: `launch-bmxt`／ツールバーの起動先。`switchwindow` で更新。既定は popup。
 */

import { PROMPT_LAUNCH_HOST_KEY } from "../extension-storage/keys.ts"
import type { BmxtHostKind } from "../bmxt-window/bmxt-host-kind.ts"
import { isBmxtHostKind } from "../bmxt-window/bmxt-host-kind.ts"

export type PromptLaunchHost = BmxtHostKind

let cachedLaunchHost: PromptLaunchHost | undefined

export function isPromptLaunchHost(value: unknown): value is PromptLaunchHost {
  return isBmxtHostKind(value)
}

export async function loadPromptLaunchHostAsync(): Promise<PromptLaunchHost> {
  if (cachedLaunchHost !== undefined) {
    return cachedLaunchHost
  }
  try {
    const raw = await chrome.storage.local.get(PROMPT_LAUNCH_HOST_KEY)
    const stored = raw[PROMPT_LAUNCH_HOST_KEY]
    if (isPromptLaunchHost(stored)) {
      cachedLaunchHost = stored
      return stored
    }
  } catch {
    /* storage unavailable */
  }
  cachedLaunchHost = "popup"
  return "popup"
}

export async function savePromptLaunchHostAsync(host: PromptLaunchHost): Promise<void> {
  cachedLaunchHost = host
  try {
    await chrome.storage.local.set({ [PROMPT_LAUNCH_HOST_KEY]: host })
  } catch {
    /* storage unavailable */
  }
}

/** EN: Test helper — clear in-memory cache. */
export function clearPromptLaunchHostCacheForTests(): void {
  cachedLaunchHost = undefined
}
