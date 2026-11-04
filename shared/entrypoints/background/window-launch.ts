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
import { getCommandsOnCommand, usesTabShell } from "../../lib/features/host-env/index.ts"
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

/** EN: Shortcut / action — popup window, or Firefox SP shell tab. */
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

/**
 * EN: Same cleanup as `windows.onRemoved` for the tracked BMXt popup window.
 *     Also used when the shell page unloads (`BMXT_POPUP_SHELL_UNLOAD` / tab close).
 * JA: ポップアップ窓削除時と同じ掃除。タブ破棄時にも使う。
 */
export async function clearPopupShellProcessStateAsync(): Promise<void> {
  flushPersistBmxtWindowBounds()
  clearBmxtWindowIdInMemory()
  void persistBmxtWindowId(undefined)
  broadcastSessionClearToUi("popup")
  const services = await loadBackgroundServicesAsync()
  await services.removeAllTerminalSessionsFromStorageAsync()
}

/** EN: Action trampoline (Firefox) asks background to open the correct shell. */
export function launchBmxtFromActionTrampoline(): void {
  void loadBackgroundServicesAsync()
  resetLaunchPerf()
  markLaunchPhase("shortcut-received")
  enqueueBmxtWindowLaunch(() => launchBmxtFromShortcutAsync())
}

function registerCommandShortcuts(): void {
  const onCommand = getCommandsOnCommand()
  if (onCommand === undefined) {
    return
  }
  onCommand.addListener((command) => {
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
}

export function setupWindowLaunch(): void {
  // EN: Window bounds are persisted from the popup page (resize/pagehide).
  //     Do not use windows.onBoundsChanged — unsupported on Firefox / flagged by AMO.
  // JA: 窓サイズはポップアップページ側で保存。onBoundsChanged は Firefox/AMO 非対応。
  setupFloatLaunch(getCommandsOnCommand())

  if (chrome.windows?.onRemoved) {
    chrome.windows.onRemoved.addListener((windowId) => {
      if (readBmxtWindowIdInMemory() !== windowId) {
        return
      }
      void clearPopupShellProcessStateAsync()
    })
  }

  // EN: Chrome has no default_popup → onClicked. Firefox uses trampoline message instead.
  // JA: Chrome は onClicked。Firefox は trampoline メッセージ。
  if (!usesTabShell()) {
    chrome.action.onClicked.addListener(() => {
      void loadBackgroundServicesAsync()
      enqueueBmxtWindowLaunch(() => openOrFocusBmxtWindowAsync())
    })
    void hydrateBmxtWindowIdFromStorage()
  }

  registerCommandShortcuts()

  resetLaunchPerf()
  markLaunchPhase("sw-listeners-ready")
}
