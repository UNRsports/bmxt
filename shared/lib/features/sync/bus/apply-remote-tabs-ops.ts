import type { SyncTabsOp } from "../types.ts"

const MAX_IDS = 200

function sanitizeIds(ids: readonly number[]): number[] {
  const out: number[] = []
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 0) {
      continue
    }
    out.push(id)
    if (out.length >= MAX_IDS) {
      break
    }
  }
  return out
}

/**
 * EN: Apply a peer-requested tab mutation on this browser (IDs are local here).
 * JA: ピアからのタブ操作要求をこのブラウザの API で実行する（id はローカル）。
 */
export async function applyRemoteTabsOps(op: SyncTabsOp): Promise<{ ok: boolean; detail: string | null }> {
  try {
    if (op.kind === "move") {
      const tabIds = sanitizeIds(op.tabIds)
      if (tabIds.length === 0 || !Number.isInteger(op.windowId) || op.windowId < 0) {
        return { ok: false, detail: "bad_move_args" }
      }
      let index = Number.isInteger(op.index) ? op.index : -1
      if (
        op.beforeTabId !== null &&
        Number.isInteger(op.beforeTabId) &&
        op.beforeTabId >= 0
      ) {
        try {
          const dest = await chrome.tabs.get(op.beforeTabId)
          if (typeof dest.index === "number") {
            index = dest.index
          }
          if (typeof dest.windowId === "number") {
            await chrome.tabs.move(tabIds, { windowId: dest.windowId, index })
          } else {
            await chrome.tabs.move(tabIds, { windowId: op.windowId, index })
          }
        } catch {
          await chrome.tabs.move(tabIds, { windowId: op.windowId, index: -1 })
        }
      } else {
        await chrome.tabs.move(tabIds, { windowId: op.windowId, index })
      }
      if (op.groupAfter && op.groupId !== null && Number.isInteger(op.groupId) && op.groupId >= 0) {
        await chrome.tabs.group({ groupId: op.groupId, tabIds })
      } else if (op.ungroup) {
        await chrome.tabs.ungroup(tabIds)
      }
      return { ok: true, detail: null }
    }
    if (op.kind === "activate") {
      if (!Number.isInteger(op.tabId) || op.tabId < 0 || !Number.isInteger(op.windowId) || op.windowId < 0) {
        return { ok: false, detail: "bad_activate_args" }
      }
      await chrome.tabs.update(op.tabId, { active: true })
      await chrome.windows.update(op.windowId, { focused: true })
      return { ok: true, detail: null }
    }
    if (op.kind === "close_tabs") {
      const tabIds = sanitizeIds(op.tabIds)
      if (tabIds.length === 0) {
        return { ok: false, detail: "no_tabs" }
      }
      await chrome.tabs.remove(tabIds)
      return { ok: true, detail: null }
    }
    if (op.kind === "close_windows") {
      const windowIds = sanitizeIds(op.windowIds)
      if (windowIds.length === 0) {
        return { ok: false, detail: "no_windows" }
      }
      await Promise.all(windowIds.map((wid) => chrome.windows.remove(wid)))
      return { ok: true, detail: null }
    }
    if (op.kind === "reload") {
      const tabIds = sanitizeIds(op.tabIds)
      if (tabIds.length === 0) {
        return { ok: false, detail: "no_tabs" }
      }
      await Promise.all(tabIds.map((tabId) => chrome.tabs.reload(tabId)))
      return { ok: true, detail: null }
    }
    if (op.kind === "focus_window") {
      if (!Number.isInteger(op.windowId) || op.windowId < 0) {
        return { ok: false, detail: "bad_window" }
      }
      await chrome.windows.update(op.windowId, { focused: true })
      return { ok: true, detail: null }
    }
    const _exhaustive: never = op
    return { ok: false, detail: `unknown_op:${String(_exhaustive)}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message.slice(0, 200) }
  }
}
