/**
 * Rust が返した Effect を Chrome API で実行し、ターミナルに出す行を返す。
 */

import type { ChromeEffect } from "./effect-types"

export type DispatchChromeContext = {
  clearLog: () => Promise<void>
  listWindows: () => Promise<string[]>
  focusInfo: () => Promise<string[]>
  resolveTabArg: (tabIdStr: string | undefined) => Promise<chrome.tabs.Tab | undefined>
}

function parseHttpUrl(urlStr: string): string | null {
  const t = urlStr.trim()
  if (!t) {
    return null
  }
  try {
    const u = new URL(t)
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null
    }
    return u.href
  } catch {
    return null
  }
}

async function tabsMoveUrl(normalized: string): Promise<string[]> {
  const tabs = await chrome.tabs.query({})
  const httpTabs = tabs.filter(
    (tab) =>
      tab.id !== undefined &&
      tab.url &&
      (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
  )
  const exact = httpTabs.find((tab) => tab.url === normalized)
  const byOpenedPrefix = httpTabs.find((tab) => tab.url!.startsWith(normalized))
  const byTypedPrefix = httpTabs.find((tab) => {
    const tu = tab.url!
    if (!normalized.startsWith(tu)) {
      return false
    }
    if (normalized.length === tu.length) {
      return true
    }
    const next = normalized[tu.length]
    return next === "/" || next === "?" || next === "#"
  })
  const pick = exact ?? byOpenedPrefix ?? byTypedPrefix
  if (pick?.id !== undefined) {
    await chrome.tabs.update(pick.id, { active: true })
    if (pick.windowId !== undefined) {
      await chrome.windows.update(pick.windowId, { focused: true })
    }
    return [`activated tab ${pick.id}: ${pick.url}`]
  }
  const created = await chrome.tabs.create({ url: normalized })
  return [`opened new tab ${created.id ?? "?"}: ${normalized}`]
}

export async function applyChromeEffects(
  ctx: DispatchChromeContext,
  effects: ChromeEffect[]
): Promise<string[]> {
  const out: string[] = []
  for (const e of effects) {
    // eslint-disable-next-line no-await-in-loop
    out.push(...(await applyOne(ctx, e)))
  }
  return out
}

async function applyOne(
  ctx: DispatchChromeContext,
  e: ChromeEffect
): Promise<string[]> {
  switch (e.kind) {
    case "clear_log":
      await ctx.clearLog()
      return ["(log cleared)"]
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
      const normalized = parseHttpUrl(e.url)
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
