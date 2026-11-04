/**
 * EN: Minimal BMXt window / overlay launch (shortcut / toolbar). No command dispatch imports.
 * JA: ショートカット・ツールバー用の軽量起動。コマンド dispatch は読み込まない。
 */

import {
  flushLaunchPerf,
  markLaunchPhase,
  resetLaunchPerf
} from "../../lib/features/launch/launch-perf"
import { broadcastSessionClearToUi } from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-notify"
import { usesActionPopupShell } from "../../lib/features/bmxt-window/shell-launch-mode"
import { loadBackgroundServicesAsync } from "./load-background-services"
import { setupFloatLaunch } from "./float-launch"
import { flushPersistBmxtWindowBounds } from "./window-bounds"
import {
  clearBmxtWindowIdInMemory,
  createBmxtWindowAsync,
  focusBmxtWindow,
  hydrateBmxtWindowIdFromStorage,
  openOrFocusBmxtWindowAsync,
  persistBmxtWindowId,
  readBmxtWindowIdInMemory,
  reconcileDuplicateBmxtWindowsAsync,
  resolveBmxtWindowIdFastAsync
} from "./window-state"

/** EN: Serialize launches so rapid shortcuts do not open multiple windows. */
let bmxtWindowLaunchChain: Promise<void> = Promise.resolve()

function enqueueBmxtWindowLaunch(task: () => Promise<void>): void {
  bmxtWindowLaunchChain = bmxtWindowLaunchChain.then(async () => {
    const chainStart = performance.now()
    try {
      await task()
    } finally {
      markLaunchPhase("launch-chain-done")
      await flushLaunchPerf({
        launchChainMs: Math.round(performance.now() - chainStart)
      })
    }
  }, async () => {
    const chainStart = performance.now()
    try {
      await task()
    } finally {
      markLaunchPhase("launch-chain-done")
      await flushLaunchPerf({
        launchChainMs: Math.round(performance.now() - chainStart)
      })
    }
  })
  void bmxtWindowLaunchChain
}

/**
 * EN: Firefox action overlay — `default_popup` opens on toolbar/Add-ons click.
 *     Shortcuts call `action.openPopup()` (user-gesture from commands).
 * JA: Firefox オーバーレイ。ショートカットは openPopup（commands がユーザー操作）。
 */
async function openBmxtActionPopupAsync(): Promise<void> {
  void loadBackgroundServicesAsync()
  markLaunchPhase("create-window-start")
  try {
    await chrome.action.openPopup()
    markLaunchPhase("create-window-done")
  } catch {
    /* Toolbar / Add-ons menu still opens the overlay via default_popup. */
  }
}

/** EN: Shortcut — focus existing window or create immediately (no tabs.query before create). */
async function launchBmxtFromShortcutAsync(): Promise<void> {
  void loadBackgroundServicesAsync()
  markLaunchPhase("resolve-window-start")
  const existingId = await resolveBmxtWindowIdFastAsync()
  markLaunchPhase("resolve-window-done")
  if (existingId !== undefined) {
    await focusBmxtWindow(existingId)
    markLaunchPhase("focus-window-done")
    return
  }
  markLaunchPhase("create-window-start")
  const createdId = await createBmxtWindowAsync()
  markLaunchPhase("create-window-done")
  if (createdId !== undefined) {
    void reconcileDuplicateBmxtWindowsAsync(createdId)
  }
}

async function resetBmxtFromShortcutAsync(): Promise<void> {
  const services = await loadBackgroundServicesAsync()
  if (usesActionPopupShell()) {
    await services.resetBmxtFromShortcutAsync(openBmxtActionPopupAsync)
    return
  }
  await services.resetBmxtFromShortcutAsync(openOrFocusBmxtWindowAsync)
}

function openOrFocusBmxtWindow(): void {
  void loadBackgroundServicesAsync()
  enqueueBmxtWindowLaunch(() => openOrFocusBmxtWindowAsync())
}

/**
 * EN: Same cleanup as `windows.onRemoved` for the tracked BMXt popup window.
 *     Also used when the Firefox action overlay unloads (`BMXT_POPUP_SHELL_UNLOAD`).
 * JA: ポップアップ窓削除時と同じ掃除。Firefox オーバーレイ破棄時にも使う。
 */
export async function clearPopupShellProcessStateAsync(): Promise<void> {
  flushPersistBmxtWindowBounds()
  clearBmxtWindowIdInMemory()
  void persistBmxtWindowId(undefined)
  broadcastSessionClearToUi("popup")
  const services = await loadBackgroundServicesAsync()
  await services.removeAllTerminalSessionsFromStorageAsync()
}

export function setupWindowLaunch(): void {
  // EN: Window bounds are persisted from the popup page (resize/pagehide).
  //     Do not use windows.onBoundsChanged — unsupported on Firefox / flagged by AMO.
  // JA: 窓サイズはポップアップページ側で保存。onBoundsChanged は Firefox/AMO 非対応。
  setupFloatLaunch(chrome.commands.onCommand)

  // EN: Firefox Android has no `browser.windows` — skip (overlay unload uses pagehide).
  // JA: Fenix は windows API なし。オーバーレイ破棄は pagehide 経由。
  if (chrome.windows?.onRemoved) {
    chrome.windows.onRemoved.addListener((windowId) => {
      if (readBmxtWindowIdInMemory() !== windowId) {
        return
      }
      void clearPopupShellProcessStateAsync()
    })
  }

  if (usesActionPopupShell()) {
    // EN: default_popup is set — action.onClicked does not fire; overlay opens from UI.
    // JA: default_popup 設定時は onClicked は発火しない（ブラウザがオーバーレイを開く）。
    chrome.commands.onCommand.addListener((command) => {
      if (command === "launch-bmxt") {
        resetLaunchPerf()
        markLaunchPhase("shortcut-received")
        enqueueBmxtWindowLaunch(() => openBmxtActionPopupAsync())
        return
      }
      if (command === "reset-bmxt") {
        enqueueBmxtWindowLaunch(() => resetBmxtFromShortcutAsync())
      }
    })
    resetLaunchPerf()
    markLaunchPhase("sw-listeners-ready")
    return
  }

  chrome.action.onClicked.addListener(() => {
    openOrFocusBmxtWindow()
  })

  chrome.commands.onCommand.addListener((command) => {
    if (command === "launch-bmxt") {
      resetLaunchPerf()
      markLaunchPhase("shortcut-received")
      enqueueBmxtWindowLaunch(() => launchBmxtFromShortcutAsync())
      return
    }
    if (command === "reset-bmxt") {
      enqueueBmxtWindowLaunch(() => resetBmxtFromShortcutAsync())
    }
  })

  void hydrateBmxtWindowIdFromStorage()

  resetLaunchPerf()
  markLaunchPhase("sw-listeners-ready")
}
