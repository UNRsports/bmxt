/**
 * EN: Handle peer `nav_control` — drive nav overlay via nav-tab-bridge.
 * JA: peer `nav_control` — nav-tab-bridge で overlay を駆動。
 */

import type { SyncNavControlOp } from "../types.ts"
import {
  applyNavTypingOnTab,
  clearNavTypingOnTab,
  clickNavOverlayOnTab,
  forwardNavKeyOnTab,
  jumpQueryNavOverlayOnTab,
  moveNavOverlayOnTab,
  startNavOverlayOnTab,
  stopNavOverlayOnTab
} from "../../nav/nav-tab-bridge.ts"

export async function applyRemoteNavControl(
  tabId: number,
  op: SyncNavControlOp
): Promise<{ ok: boolean; detail: string | null }> {
  if (!Number.isFinite(tabId) || tabId < 0) {
    return { ok: false, detail: "invalid tabId" }
  }
  try {
    let result: { ok: boolean; reason?: string }
    switch (op.kind) {
      case "start":
        result = await startNavOverlayOnTab(tabId, null, op.useCenter === true)
        break
      case "stop":
        await stopNavOverlayOnTab(tabId)
        return { ok: true, detail: null }
      case "move":
        result = await moveNavOverlayOnTab(tabId, op.dx, op.dy, op.freeMove === true)
        break
      case "click":
        result = await clickNavOverlayOnTab(tabId)
        break
      case "key":
        result = await forwardNavKeyOnTab(tabId, {
          key: op.key,
          code: op.code,
          ctrlKey: op.ctrlKey === true,
          shiftKey: op.shiftKey === true,
          altKey: op.altKey === true,
          metaKey: op.metaKey === true
        })
        break
      case "jump_query":
        result = await jumpQueryNavOverlayOnTab(tabId, op.query, [], 0, op.preview === true)
        break
      case "apply_typing":
        result = await applyNavTypingOnTab(tabId, op.text)
        break
      case "clear_typing":
        result = await clearNavTypingOnTab(tabId)
        break
      default: {
        const _exhaustive: never = op
        void _exhaustive
        return { ok: false, detail: "unknown nav op" }
      }
    }
    if (result.ok) {
      return { ok: true, detail: null }
    }
    return { ok: false, detail: result.reason ?? "nav_control failed" }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message }
  }
}
