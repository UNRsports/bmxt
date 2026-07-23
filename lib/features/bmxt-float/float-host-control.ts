/**
 * EN: SW helpers to show/hide/toggle the in-page float host on a tab.
 * JA: タブ上フロートの表示／非表示／トグル（SW 用）。
 */

import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  BMXT_FLOAT_MESSAGE_TYPE,
  type BmxtFloatHostAction,
  type BmxtFloatHostResponse
} from "./float-host-message.ts"
import { setFloatDesiredVisibleOnTab } from "./float-visible-tabs.ts"

export async function sendFloatHostAction(
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
    // Content script missing or host permission not granted — no-op.
    return null
  }
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
