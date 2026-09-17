/**
 * EN: Move BMXt UI between popup window and in-page float (sessions + browse).
 * JA: ポップアップ窓とサイト上フロートの間でセッション／ブラウズを移動。
 */

import type { ChromeEffect } from "../../effect-types"
import type { DispatchChromeContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { isScriptablePageUrl, describeNonScriptableReason } from "../../../url/is-scriptable-page-url"
import {
  appendLinesToHostSnapshot,
  type HostSwitchSnapshot
} from "../../../bmxt-float/host-switch-snapshot"
import {
  isTerminalSessionsStateV1,
  saveFloatTerminalSessionsForTab
} from "../../../bmxt-float/float-terminal-session-storage"
import {
  createEmptyFloatBrowseState,
  saveFloatBrowseStateForTab
} from "../../../bmxt-float/float-browse-state-storage"
import { setFloatDesiredVisibleOnTab } from "../../../bmxt-float/float-visible-tabs"
import {
  broadcastPopupHandoffReady,
  savePendingPopupHandoff
} from "../../../bmxt-float/popup-pending-handoff"
import { savePromptLaunchHostAsync } from "../../../bmxt-float/prompt-launch-host"

type E = Extract<ChromeEffect, { kind: "switch_window" }>

function emptySessionsFallback(): HostSwitchSnapshot["sessions"] {
  const id = `switch_${Date.now()}`
  return {
    v: 2,
    order: [id],
    activeId: id,
    logsById: { [id]: [] },
    namesById: {}
  }
}

function resolveSnapshot(ctx: DispatchChromeContext): HostSwitchSnapshot {
  const snap = ctx.hostSnapshot
  if (snap && isTerminalSessionsStateV1(snap.sessions)) {
    return {
      sessions: snap.sessions,
      browse: snap.browse ?? createEmptyFloatBrowseState(),
      floatTabId: snap.floatTabId
    }
  }
  return {
    sessions: emptySessionsFallback(),
    browse: createEmptyFloatBrowseState(),
    floatTabId: ctx.floatTabId
  }
}

export async function applySwitchWindowEffect(
  ctx: DispatchChromeContext,
  _e: E
): Promise<string[]> {
  const hostKind = ctx.hostKind ?? "popup"
  const promptEcho = `> switchwindow`

  if (hostKind === "popup") {
    const tab = await ctx.resolveTabArg(undefined)
    if (!tab?.id) {
      return [effectT(ctx, "effect.switchWindow.noTarget")]
    }
    if (!isScriptablePageUrl(tab.url)) {
      const reason = describeNonScriptableReason(tab.url) ?? "not scriptable"
      return [
        effectT(ctx, "effect.switchWindow.notScriptable", { reason })
      ]
    }

    const movedLine = effectT(ctx, "effect.switchWindow.toFloat")
    let snapshot = resolveSnapshot(ctx)
    snapshot = appendLinesToHostSnapshot(snapshot, ctx.commandSessionId, [
      promptEcho,
      movedLine
    ])

    await saveFloatTerminalSessionsForTab(tab.id, snapshot.sessions)
    await saveFloatBrowseStateForTab(tab.id, snapshot.browse)
    await setFloatDesiredVisibleOnTab(tab.id, true)

    const shown = await ctx.showFloatOnTab?.(tab.id)
    if (shown === false) {
      return [effectT(ctx, "effect.switchWindow.floatFailed")]
    }

    await savePromptLaunchHostAsync("float")
    await ctx.closePopupAfterSwitch?.()
    return []
  }

  // float → popup
  const floatTabId =
    ctx.floatTabId ??
    ctx.hostSnapshot?.floatTabId ??
    (typeof ctx.senderTabId === "number" ? ctx.senderTabId : undefined)

  const movedLine = effectT(ctx, "effect.switchWindow.toPopup")
  let snapshot = resolveSnapshot(ctx)
  snapshot = appendLinesToHostSnapshot(snapshot, ctx.commandSessionId, [
    promptEcho,
    movedLine
  ])

  await savePendingPopupHandoff({
    sessions: snapshot.sessions,
    browse: snapshot.browse
  })
  await savePromptLaunchHostAsync("popup")
  await ctx.openOrFocusPopupAfterSwitch?.()
  broadcastPopupHandoffReady()

  if (typeof floatTabId === "number") {
    await ctx.hideFloatAfterSwitch?.(floatTabId)
  }

  return []
}
