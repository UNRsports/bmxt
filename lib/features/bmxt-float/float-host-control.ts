/**
 * EN: SW helpers to show/hide/toggle the in-page float host on a tab.
 * JA: タブ上フロートの表示／非表示／トグル（SW 用）。
 */

import { ensurePageContentScript } from "../page-scripting/ensure-content-script.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
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

export async function sendFloatHostAction(
  tabId: number,
  action: BmxtFloatHostAction
): Promise<boolean | null> {
  const first = await sendFloatMessage(tabId, action)
  if (first !== null) {
    return first
  }
  if (!(await ensurePageContentScript(tabId))) {
    return null
  }
  return sendFloatMessage(tabId, action)
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
