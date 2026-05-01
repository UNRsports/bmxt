/**
 * 1 件の ChromeEffect を実行。新しい effect 種別はここに `case` を追記し、
 * 可能なら `lib/features/builtin-commands/<kind>/` の関数に委譲する。
 */

import type { ChromeEffect } from "../effect-types"
import type { DispatchChromeContext } from "../dispatch-context"
import { parseHttpUrlForEffect, tabsMoveUrl } from "./shared"

export async function applyOne(
  ctx: DispatchChromeContext,
  e: ChromeEffect
): Promise<string[]> {
  switch (e.kind) {
    case "clear_log":
      await ctx.clearLog()
      return ["(log cleared)"]
    case "exit_bmxt":
      return ctx.exitBmxt()
    case "list_windows":
      return ctx.listWindows()
    case "focus_info":
      return ctx.focusInfo()
    case "activate": {
      const tab = await chrome.tabs.get(e.tab_id)
      await chrome.tabs.update(e.tab_id, { active: true })
      await chrome.windows.update(tab.windowId, { focused: true })
      return [`activated tab ${e.tab_id} (window ${tab.windowId})`]
    }
    case "close_tab":
      await chrome.tabs.remove(e.tab_id)
      return [`closed tab ${e.tab_id}`]
    case "go_back": {
      const tab = await ctx.resolveTabArg(e.tab_id_arg ?? undefined)
      if (!tab?.id) {
        return ["no target tab (set focus window or pass tabId)"]
      }
      await chrome.tabs.goBack(tab.id)
      return [`goBack tab ${tab.id}`]
    }
    case "go_forward": {
      const tab = await ctx.resolveTabArg(e.tab_id_arg ?? undefined)
      if (!tab?.id) {
        return ["no target tab (set focus window or pass tabId)"]
      }
      await chrome.tabs.goForward(tab.id)
      return [`goForward tab ${tab.id}`]
    }
    case "move_tab":
      await chrome.tabs.move(e.tab_id, {
        windowId: e.window_id,
        index: e.index ?? -1
      })
      return [`moved tab ${e.tab_id} -> window ${e.window_id}`]
    case "new_tab": {
      const tab = await chrome.tabs.create({
        url: e.url || "chrome://newtab"
      })
      return [`created tab ${tab.id}: ${tab.pendingUrl || tab.url || ""}`]
    }
    case "list_tab_groups": {
      const groups = await chrome.tabGroups.query({})
      if (groups.length === 0) {
        return ["(no tab groups)"]
      }
      return groups.map(
        (g) =>
          `${g.id}\twin=${g.windowId}\tcolor=${g.color}\t"${g.title || ""}"\ttabs...`
      )
    }
    case "group_new": {
      const groupId = await chrome.tabs.group({ tabIds: e.tab_ids })
      return [`created group ${groupId}`]
    }
    case "tabs_nu": {
      const tab = await ctx.resolveTabArg(undefined)
      const u = tab?.url
      if (!u) {
        return [
          "(no URL for current tab — focus a normal window with a page, or pass a tab id context)"
        ]
      }
      return [u]
    }
    case "tabs_move_url": {
      const normalized = parseHttpUrlForEffect(e.url)
      if (!normalized) {
        return ["usage: tabs -mu|-moveurl <http(s)-url>"]
      }
      return tabsMoveUrl(normalized)
    }
    case "open_url_new_window": {
      const w = await chrome.windows.create({ url: e.url })
      return [`opened new window ${w.id}: ${e.url}`]
    }
    case "navigate_current_tab": {
      const tab = await ctx.resolveTabArg(undefined)
      if (!tab?.id) {
        return [
          "no target tab for current navigation (focus a normal window with a page)"
        ]
      }
      await chrome.tabs.update(tab.id, { url: e.url })
      return [`navigated tab ${tab.id}: ${e.url}`]
    }
    case "open_url_new_tab": {
      const t = await chrome.tabs.create({ url: e.url })
      return [`opened new tab ${t.id}: ${e.url}`]
    }
    default: {
      const _x: never = e
      return [`internal: unknown effect ${JSON.stringify(_x)}`]
    }
  }
}
