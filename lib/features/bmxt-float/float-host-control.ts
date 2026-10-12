/**
 * EN: SW helpers to show/hide/toggle the in-page float host on a tab.
 * JA: タブ上フロートの表示／非表示／トグル（SW 用）。
 */

import { canScriptHttpHostPages } from "../extension-permissions/optional-http-hosts.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import {
  BMXT_FLOAT_MESSAGE_TYPE,
  type BmxtFloatHostAction,
  type BmxtFloatHostResponse
} from "./float-host-message.ts"
import { showFloatOnTabWithInject } from "./float-show-sequence.ts"
import { setFloatDesiredVisibleOnTab } from "./float-visible-tabs.ts"

export { showFloatOnTabWithInject } from "./float-show-sequence.ts"

/** EN: WXT-built content script that hosts the float (same as nav overlay CS). */
export const FLOAT_HOST_CONTENT_SCRIPT_FILE = "content-scripts/bmxt-nav-overlay.js"

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

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

/**
 * EN: Inject the registered float/nav content script without reloading the page.
 * JA: ページをリロードせず常駐 CS を programmatic 注入する。
 */
export async function injectFloatHostContentScript(tabId: number): Promise<boolean> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return false
  }
  if (!(await canScriptHttpHostPages())) {
    return false
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [FLOAT_HOST_CONTENT_SCRIPT_FILE]
    })
    return true
  } catch {
    return false
  }
}

/**
 * EN: Show the in-page float on a tab (inject CS when missing). Returns whether visible.
 * JA: タブ上フロートを表示（CS 未注入なら注入）。表示できたか boolean を返す。
 */
export async function showBmxtFloatOnTabAsync(tabId: number): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId).catch(() => undefined)
  if (!tab || !isScriptablePageUrl(tab.url)) {
    return false
  }
  return showFloatOnTabWithInject(tabId, {
    sendShow: (id) => sendFloatHostAction(id, "show"),
    inject: injectFloatHostContentScript,
    markDesired: (id) => setFloatDesiredVisibleOnTab(id, true),
    wait: delay
  })
}
