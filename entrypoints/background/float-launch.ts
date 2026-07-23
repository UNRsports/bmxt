/**
 * EN: Toggle the in-page float prompt; re-show after same-tab navigations.
 * JA: サイト上フロートのトグルと、同一タブ遷移後の自動再表示。
 */

import { clearFloatTerminalSessionsForTab } from "../../lib/features/bmxt-float/float-terminal-session-storage"
import { clearFloatBrowseStateForTab } from "../../lib/features/bmxt-float/float-browse-state-storage"
import {
  sendFloatHostAction,
  showBmxtFloatOnTabAsync
} from "../../lib/features/bmxt-float/float-host-control"
import { tryDeliverPendingFloatHandoff } from "../../lib/features/bmxt-float/float-tab-handoff"
import {
  isBmxtFloatVisibilityMessage
} from "../../lib/features/bmxt-float/float-host-message"
import {
  clearFloatDesiredVisibleOnTab,
  hydrateFloatVisibleTabs,
  isFloatDesiredVisibleOnTab,
  setFloatDesiredVisibleOnTab
} from "../../lib/features/bmxt-float/float-visible-tabs"
import { isScriptablePageUrl } from "../../lib/features/url/is-scriptable-page-url"

async function resolveActiveTabAsync(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

async function applyDesiredVisibility(
  tabId: number,
  visible: boolean,
  clearSessions: boolean
): Promise<void> {
  await setFloatDesiredVisibleOnTab(tabId, visible)
  if (!visible && clearSessions) {
    await clearFloatTerminalSessionsForTab(tabId)
    await clearFloatBrowseStateForTab(tabId)
  }
}

export async function toggleBmxtFloatOnActiveTabAsync(): Promise<void> {
  const tab = await resolveActiveTabAsync()
  if (tab?.id === undefined) {
    return
  }
  if (!isScriptablePageUrl(tab.url)) {
    return
  }
  const visible = await sendFloatHostAction(tab.id, "toggle")
  if (visible === null) {
    return
  }
  await applyDesiredVisibility(tab.id, visible, false)
}

/** EN: Hide the in-page float prompt on a tab (e.g. `exit` from float host). */
export async function hideBmxtFloatOnTabAsync(
  tabId: number,
  options: { clearSessions?: boolean } = {}
): Promise<void> {
  const clearSessions = options.clearSessions === true
  await sendFloatHostAction(tabId, "hide")
  await applyDesiredVisibility(tabId, false, clearSessions)
}

export { showBmxtFloatOnTabAsync }

async function reShowFloatIfDesired(tabId: number, url: string | undefined): Promise<void> {
  await hydrateFloatVisibleTabs()
  if (await tryDeliverPendingFloatHandoff(tabId, url, showBmxtFloatOnTabAsync)) {
    return
  }
  if (!isFloatDesiredVisibleOnTab(tabId)) {
    return
  }
  if (!isScriptablePageUrl(url)) {
    return
  }
  // EN: Brief delay so the content script can finish injecting after navigation.
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 120)
  })
  const visible = await sendFloatHostAction(tabId, "show")
  if (visible === null) {
    // EN: Retry once after CS may still be loading.
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 400)
    })
    await sendFloatHostAction(tabId, "show")
  }
}

export function setupFloatLaunch(
  onCommand: typeof chrome.commands.onCommand
): void {
  void hydrateFloatVisibleTabs()

  onCommand.addListener((command) => {
    if (command !== "toggle-bmxt-float") {
      return
    }
    void toggleBmxtFloatOnActiveTabAsync()
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isBmxtFloatVisibilityMessage(message)) {
      return false
    }
    void applyDesiredVisibility(
      message.tabId,
      message.visible,
      message.clearSessions === true
    ).then(() => {
      try {
        sendResponse({ ok: true })
      } catch {
        /* port closed */
      }
    })
    return true
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") {
      return
    }
    void reShowFloatIfDesired(tabId, tab.url ?? changeInfo.url)
  })

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void chrome.tabs.get(activeInfo.tabId).then((tab) => {
      void tryDeliverPendingFloatHandoff(activeInfo.tabId, tab.url, showBmxtFloatOnTabAsync)
    }).catch(() => {
      /* tab may be gone */
    })
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearFloatDesiredVisibleOnTab(tabId)
    void clearFloatTerminalSessionsForTab(tabId)
    void clearFloatBrowseStateForTab(tabId)
  })
}
