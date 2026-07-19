/**
 * EN: Toggle the in-page float prompt on the active scriptable tab.
 * JA: アクティブなスクリプト可能タブ上のフロート・プロンプトをトグルする。
 */

import { isScriptablePageUrl } from "../../lib/features/url/is-scriptable-page-url"
import {
  BMXT_FLOAT_MESSAGE_TYPE,
  type BmxtFloatHostResponse
} from "../../lib/features/bmxt-float/float-host-message"

async function resolveActiveTabAsync(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

export async function toggleBmxtFloatOnActiveTabAsync(): Promise<void> {
  const tab = await resolveActiveTabAsync()
  if (tab?.id === undefined) {
    return
  }
  if (!isScriptablePageUrl(tab.url)) {
    return
  }
  await sendFloatHostAction(tab.id, "toggle")
}

/** EN: Hide the in-page float prompt on a tab (e.g. `exit` from float host). */
export async function hideBmxtFloatOnTabAsync(tabId: number): Promise<void> {
  await sendFloatHostAction(tabId, "hide")
}

async function sendFloatHostAction(
  tabId: number,
  action: "toggle" | "show" | "hide"
): Promise<void> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: BMXT_FLOAT_MESSAGE_TYPE,
      action
    })) as BmxtFloatHostResponse | undefined
    if (response && response.ok === false) {
      return
    }
  } catch {
    // Content script missing or host permission not granted — no-op.
  }
}

export function setupFloatLaunch(
  onCommand: typeof chrome.commands.onCommand
): void {
  onCommand.addListener((command) => {
    if (command !== "toggle-bmxt-float") {
      return
    }
    void toggleBmxtFloatOnActiveTabAsync()
  })
}
