/**
 * EN: Toggle the in-page float prompt; re-show after same-tab navigations.
 * JA: サイト上フロートのトグルと、同一タブ遷移後の自動再表示。
 */

import { LAST_NORMAL_WINDOW_KEY } from "../../lib/features/extension-storage/keys"
import { clearFloatTerminalSessionsForTab } from "../../lib/features/bmxt-float/float-terminal-session-storage"
import { clearFloatBrowseStateForTab } from "../../lib/features/bmxt-float/float-browse-state-storage"
import {
  sendFloatHostAction,
  showBmxtFloatOnTabAsync
} from "../../lib/features/bmxt-float/float-host-control"
import { tryDeliverPendingFloatHandoff } from "../../lib/features/bmxt-float/float-tab-handoff"
import {
  BMXT_FLOAT_GEOMETRY_MESSAGE_TYPE,
  isBmxtFloatGeometryNudgeMessage,
  isBmxtFloatVisibilityMessage
} from "../../lib/features/bmxt-float/float-host-message"
import {
  clearFloatDesiredVisibleOnTab,
  hydrateFloatVisibleTabs,
  isFloatDesiredVisibleOnTab,
  setFloatDesiredVisibleOnTab
} from "../../lib/features/bmxt-float/float-visible-tabs"
import { isScriptablePageUrl } from "../../lib/features/url/is-scriptable-page-url"
import { BMXT_PAGE, readBmxtWindowIdInMemory } from "./window-state"

async function resolveActiveTabInWindow(
  windowId: number
): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ windowId, active: true })
  return tabs[0]
}

/**
 * EN: Prefer the last focused normal window's active tab (not the BMXt popup).
 * JA: 通常ウィンドウのアクティブタブを優先（BMXt ポップアップ窓は使わない）。
 */
export async function resolveFloatLaunchTargetTabAsync(): Promise<
  chrome.tabs.Tab | undefined
> {
  const bmxtWindowId = readBmxtWindowIdInMemory()

  try {
    const stored = await chrome.storage.local.get(LAST_NORMAL_WINDOW_KEY)
    const normalId = stored[LAST_NORMAL_WINDOW_KEY]
    if (typeof normalId === "number" && Number.isInteger(normalId)) {
      try {
        const win = await chrome.windows.get(normalId)
        if (win.type === "normal") {
          const tab = await resolveActiveTabInWindow(normalId)
          if (tab) {
            return tab
          }
        }
      } catch {
        /* window gone */
      }
    }
  } catch {
    /* storage unavailable */
  }

  try {
    const focused = await chrome.windows.getLastFocused({ populate: true })
    if (
      focused.type === "normal" &&
      focused.id !== undefined &&
      focused.id !== bmxtWindowId
    ) {
      return focused.tabs?.find((tab) => tab.active) ?? focused.tabs?.[0]
    }
  } catch {
    /* ignore */
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const tab = tabs[0]
  if (!tab) {
    return undefined
  }
  const pageUrl = chrome.runtime.getURL(BMXT_PAGE)
  if (typeof tab.url === "string" && tab.url.startsWith(pageUrl)) {
    return undefined
  }
  return tab
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
  const tab = await resolveFloatLaunchTargetTabAsync()
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

/**
 * EN: Launch-shortcut path when prompt host is float — show or hide (toggle).
 * JA: 起動先がフロートのときのショートカット（表示／非表示トグル）。
 */
export async function launchOrToggleFloatFromShortcutAsync(): Promise<void> {
  await toggleBmxtFloatOnActiveTabAsync()
}

/** EN: Always show float on the launch target tab (reset / forced show). */
export async function showFloatOnLaunchTargetAsync(): Promise<void> {
  const tab = await resolveFloatLaunchTargetTabAsync()
  if (tab?.id === undefined) {
    return
  }
  if (!isScriptablePageUrl(tab.url)) {
    return
  }
  await showBmxtFloatOnTabAsync(tab.id)
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
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 120)
  })
  const visible = await sendFloatHostAction(tabId, "show")
  if (visible === null) {
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isBmxtFloatGeometryNudgeMessage(message)) {
      const tabId =
        typeof message.tabId === "number"
          ? message.tabId
          : typeof sender.tab?.id === "number"
            ? sender.tab.id
            : undefined
      if (tabId === undefined) {
        sendResponse({ ok: false, reason: "no_tab" })
        return true
      }
      void chrome.tabs
        .sendMessage(tabId, {
          type: BMXT_FLOAT_GEOMETRY_MESSAGE_TYPE,
          mode: message.mode,
          arrow: message.arrow,
          tabId
        })
        .then((response) => {
          try {
            sendResponse(response ?? { ok: true })
          } catch {
            /* port closed */
          }
        })
        .catch(() => {
          try {
            sendResponse({ ok: false, reason: "cs_unreachable" })
          } catch {
            /* port closed */
          }
        })
      return true
    }
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
