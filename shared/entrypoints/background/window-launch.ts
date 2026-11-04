/**
 * EN: Minimal BMXt window / tab launch (shortcut / toolbar). No command dispatch imports.
 * JA: ショートカット・ツールバー用の軽量起動。コマンド dispatch は読み込まない。
 */

import {
  flushLaunchPerf,
  markLaunchPhase,
  resetLaunchPerf
} from "../../lib/features/launch/launch-perf"
import { broadcastSessionClearToUi } from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-notify"
import { usesTabShell } from "../../lib/features/bmxt-window/shell-launch-mode"
import { loadBackgroundServicesAsync } from "./load-background-services"
import { setupFloatLaunch } from "./float-launch"
import { flushPersistBmxtWindowBounds } from "./window-bounds"
import {
  clearBmxtWindowIdInMemory,
  createBmxtWindowAsync,
  focusBmxtWindow,
  hydrateBmxtWindowIdFromStorage,
  openOrFocusBmxtShellTabAsync,
  openOrFocusBmxtWindowAsync,
  persistBmxtWindowId,
  readBmxtWindowIdInMemory,
  reconcileDuplicateBmxtWindowsAsync,
  resolveBmxtWindowIdFastAsync
} from "./window-state"

/** EN: Serialize launches so rapid shortcuts do not open multiple windows/tabs. */
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

/** EN: Shortcut — focus existing window or create immediately (no tabs.query before create). */
async function launchBmxtFromShortcutAsync(): Promise<void> {
  void loadBackgroundServicesAsync()
  if (usesTabShell()) {
    markLaunchPhase("create-window-start")
    await openOrFocusBmxtShellTabAsync()
    markLaunchPhase("create-window-done")
    return
  }
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
  if (usesTabShell()) {
    await services.resetBmxtFromShortcutAsync(openOrFocusBmxtShellTabAsync)
    return
  }
  await services.resetBmxtFromShortcutAsync(openOrFocusBmxtWindowAsync)
}

function openOrFocusBmxtHost(): void {
  void loadBackgroundServicesAsync()
  if (usesTabShell()) {
    enqueueBmxtWindowLaunch(() => openOrFocusBmxtShellTabAsync())
    return
  }
  enqueueBmxtWindowLaunch(() => openOrFocusBmxtWindowAsync())
}

/**
 * EN: Same cleanup as `windows.onRemoved` for the tracked BMXt popup window.
 *     Also used when the shell page unloads (`BMXT_POPUP_SHELL_UNLOAD` / tab close).
 * JA: ポップアップ窓削除時と同じ掃除。タブシェル破棄時にも使う。
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

  // EN: Firefox Android has no `browser.windows` — skip (tab unload uses pagehide).
  // JA: Fenix は windows API なし。タブ破棄は pagehide 経由。
  if (chrome.windows?.onRemoved) {
    chrome.windows.onRemoved.addListener((windowId) => {
      if (readBmxtWindowIdInMemory() !== windowId) {
        return
      }
      void clearPopupShellProcessStateAsync()
    })
  }

  // EN: No default_popup — toolbar / Add-ons click fires onClicked (Chrome window, Firefox tab).
  // JA: default_popup なし。ツールバー／Add-ons クリックで onClicked。
  chrome.action.onClicked.addListener(() => {
    openOrFocusBmxtHost()
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

  if (!usesTabShell()) {
    void hydrateBmxtWindowIdFromStorage()
  }

  resetLaunchPerf()
  markLaunchPhase("sw-listeners-ready")
}
