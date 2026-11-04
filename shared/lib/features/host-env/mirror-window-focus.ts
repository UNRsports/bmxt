/**
 * EN: Dispatcher — PC vs SP window-focus mirroring helpers.
 * JA: PC / SP のウィンドウフォーカスミラーを振り分ける。
 */

import { resolveFormFactor } from "./resolve-form-factor.ts"
import * as pc from "./pc/mirror-window-focus.ts"
import * as sp from "./sp/mirror-window-focus.ts"

export type MirrorFocusHandler = pc.MirrorFocusHandler

function impl() {
  return resolveFormFactor() === "sp" ? sp : pc
}

export function addMirrorWindowFocusListener(handler: MirrorFocusHandler): () => void {
  return impl().addMirrorWindowFocusListener(handler)
}

export async function getNormalWindowOrNull(
  windowId: number
): Promise<chrome.windows.Window | null> {
  return impl().getNormalWindowOrNull(windowId)
}

export async function getLastFocusedWindowOrNull(): Promise<chrome.windows.Window | null> {
  return impl().getLastFocusedWindowOrNull()
}
