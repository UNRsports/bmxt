/**
 * 1 件の ChromeEffect を実行。新しい effect 種別はここに `case` を追記し、
 * 可能なら `lib/features/builtin-commands/<kind>/` の関数に委譲する。
 */

import type { ChromeEffect } from "../effect-types"
import type { DispatchChromeContext } from "../dispatch-context"
import {
  linesForCurrentVersion,
  linesForVersionKey,
  linesVersionList
} from "../../release-notes/format-terminal"
import { parseHttpUrlForEffect, tabsMoveUrl } from "./shared"

export async function applyOne(
  ctx: DispatchChromeContext,
  e: ChromeEffect
): Promise<string[]> {
  switch (e.kind) {
    case "clear_log":
      await ctx.clearLog()
      return ["(log cleared)"]
    case "exit_pane":
      return ctx.exitPane()
    case "close_tab":
      await chrome.tabs.remove(e.tab_id)
      return [`closed tab ${e.tab_id}`]
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
        return ["usage: tabs -moveurl <http(s)-url>"]
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
    case "release_notes_current": {
      const v = chrome.runtime.getManifest().version
      return linesForCurrentVersion(v)
    }
    case "release_notes_version":
      return linesForVersionKey(e.version)
    case "release_notes_list":
      return linesVersionList()
    default: {
      const _x: never = e
      return [`internal: unknown effect ${JSON.stringify(_x)}`]
    }
  }
}
