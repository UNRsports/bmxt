import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<ChromeEffect, { kind: "tab_reload" }>

export async function applyTabReloadEffect(
  ctx: DispatchChromeContext,
  e: E
): Promise<string[]> {
  const lines: string[] = []
  const ids = e.tab_ids.filter((id) => Number.isInteger(id) && id >= 0)

  if (ids.length === 0) {
    const tab = await ctx.resolveTabArg(undefined)
    if (!tab?.id) {
      return [effectT(ctx, "effect.tabReload.noTarget")]
    }
    try {
      await chrome.tabs.reload(tab.id)
    } catch {
      return [
        effectT(ctx, "effect.tabReload.failed", {
          tabId: String(tab.id)
        })
      ]
    }
    return [
      effectT(ctx, "effect.tabReload.done", {
        tabId: String(tab.id)
      })
    ]
  }

  for (const tabId of ids) {
    try {
      await chrome.tabs.reload(tabId)
      lines.push(
        effectT(ctx, "effect.tabReload.done", {
          tabId: String(tabId)
        })
      )
    } catch {
      lines.push(
        effectT(ctx, "effect.tabReload.failed", {
          tabId: String(tabId)
        })
      )
    }
  }
  return lines
}
