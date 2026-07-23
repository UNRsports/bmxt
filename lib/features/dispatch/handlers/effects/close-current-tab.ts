import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import {
  appendHandoffLogLines,
  placeFloatHandoffOnTab,
  takeFloatHandoffFromTab,
  type FloatTabHandoffPayload
} from "../../../bmxt-float/float-tab-handoff"
import { showBmxtFloatOnTabAsync } from "../../../bmxt-float/float-host-control"
import { effectT } from "../effect-i18n"
import { resolveTabRefDisplay, tabRefEffectLine } from "./tab-ref-effect-line"

type E = Extract<ChromeEffect, { kind: "close_current_tab" }>

export async function applyCloseCurrentTabEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const tab = await ctx.resolveTabArg(undefined)
  if (!tab?.id) {
    return [effectT(ctx, "effect.closeCurrentTab.noTarget")]
  }
  const tabId = tab.id
  const windowId = tab.windowId
  const display = await resolveTabRefDisplay(tab)
  const doneLine = tabRefEffectLine(ctx, "effect.closeCurrentTab.done", display)

  // EN: Snapshot before remove — onRemoved clears per-tab float storage.
  const taken = await takeFloatHandoffFromTab(tabId)
  let handoff: FloatTabHandoffPayload | null = null
  if (taken) {
    handoff = {
      sessions: appendHandoffLogLines(taken.sessions, ctx.commandSessionId, [doneLine]),
      browse: taken.browse
    }
  }

  try {
    await chrome.tabs.remove(tabId)
  } catch {
    return [tabRefEffectLine(ctx, "effect.closeCurrentTab.failed", display)]
  }

  if (handoff) {
    let destTabId: number | null = null
    let destUrl: string | undefined
    if (typeof windowId === "number") {
      try {
        const activeTabs = await chrome.tabs.query({ windowId, active: true })
        const dest = activeTabs[0]
        if (dest?.id !== undefined) {
          destTabId = dest.id
          destUrl = dest.url
        }
      } catch {
        /* window may be gone */
      }
    }
    await placeFloatHandoffOnTab(handoff, destTabId, destUrl, showBmxtFloatOnTabAsync)
  }

  return [doneLine]
}
