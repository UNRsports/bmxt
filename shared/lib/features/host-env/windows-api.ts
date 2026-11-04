/**
 * EN: Dispatcher — PC vs SP `windows` implementation.
 * JA: PC / SP の windows 実装を振り分ける。
 */

import { resolveFormFactor } from "./resolve-form-factor.ts"
import * as pc from "./pc/windows-api.ts"
import * as sp from "./sp/windows-api.ts"

function impl() {
  return resolveFormFactor() === "sp" ? sp : pc
}

export function hasWindowsApi(): boolean {
  return impl().hasWindowsApi()
}

export async function getAllWindows(
  getInfo?: chrome.windows.QueryOptions
): Promise<chrome.windows.Window[]> {
  return impl().getAllWindows(getInfo)
}

export function addWindowsLifecycleListeners(listener: () => void): () => void {
  return impl().addWindowsLifecycleListeners(listener)
}
