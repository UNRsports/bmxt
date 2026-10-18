/**
 * EN: SW helpers to show/hide/toggle the in-page float host on a tab.
 * JA: タブ上フロートの表示／非表示／トグル（SW 用）。
 */

import { ensurePageContentScript } from "../page-scripting/ensure-content-script.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  clearFloatLaunchAuthForTab,
  mintFloatLaunchAuthForTab
} from "./float-launch-auth.ts"
import {
  BMXT_FLOAT_MESSAGE_TYPE,
  type BmxtFloatHostAction,
  type BmxtFloatHostResponse
} from "./float-host-message.ts"
import { setFloatDesiredVisibleOnTab } from "./float-visible-tabs.ts"

async function sendFloatMessage(
  tabId: number,
  action: BmxtFloatHostAction
): Promise<boolean | null> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: BMXT_FLOAT_MESSAGE_TYPE,
      action,
      tabId
    })) as BmxtFloatHostResponse | undefined
    if (!response || response.ok === false) {
      return null
    }
    return response.visible
  } catch {
    return null
  }
}

async function prepareFloatLaunchAuth(tabId: number, action: BmxtFloatHostAction): Promise<void> {
  if (action === "hide") {
    await clearFloatLaunchAuthForTab(tabId)
    return
  }
  // EN: show / toggle may reveal the float — mint parent-origin auth before the CS loads it.
  await mintFloatLaunchAuthForTab(tabId)
}

export async function sendFloatHostAction(
  tabId: number,
  action: BmxtFloatHostAction
): Promise<boolean | null> {
  await prepareFloatLaunchAuth(tabId, action)
  const first = await sendFloatMessage(tabId, action)
  if (first !== null) {
    if (action === "toggle" && first === false) {
      await clearFloatLaunchAuthForTab(tabId)
    }
    return first
  }
  if (!(await ensurePageContentScript(tabId))) {
    return null
  }
  await prepareFloatLaunchAuth(tabId, action)
  const second = await sendFloatMessage(tabId, action)
  if (action === "toggle" && second === false) {
    await clearFloatLaunchAuthForTab(tabId)
  }
  return second
}

export async function showBmxtFloatOnTabAsync(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (!tab || !isScriptablePageUrl(tab.url)) {
    return
  }
  const visible = await sendFloatHostAction(tabId, "show")
  if (visible === true) {
    await setFloatDesiredVisibleOnTab(tabId, true)
  }
}
