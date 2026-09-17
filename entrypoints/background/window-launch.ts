/**
 * EN: Minimal BMXt window launch (shortcut / toolbar). No command dispatch imports.
 * JA: ショートカット・ツールバー用の軽量起動。コマンド dispatch は読み込まない。
 */

import {
  flushLaunchPerf,
  markLaunchPhase,
  resetLaunchPerf
} from "../../lib/features/launch/launch-perf"
import { broadcastSessionClearToUi } from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-notify"
import { loadPromptLaunchHostAsync } from "../../lib/features/bmxt-float/prompt-launch-host"
import { loadBackgroundServicesAsync } from "./load-background-services"
import {
  launchOrToggleFloatFromShortcutAsync,
  setupFloatLaunch,
  showFloatOnLaunchTargetAsync
} from "./float-launch"
import {
  flushPersistBmxtWindowBounds,
  normalizeBmxtWindowBounds,
  schedulePersistBmxtWindowBounds
} from "./window-bounds"
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

function setupBmxtWindowBoundsTracking(): void {
  chrome.windows.onBoundsChanged.addListener((window) => {
    void (async () => {
      await hydrateBmxtWindowIdFromStorage()
      const bmxtWindowId = readBmxtWindowIdInMemory()
      if (bmxtWindowId === undefined || window.id !== bmxtWindowId) {
        return
      }
      const bounds = normalizeBmxtWindowBounds(window.width, window.height)
      if (bounds === null) {
        return
      }
      schedulePersistBmxtWindowBounds(bounds)
    })()
  })
}

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

/** EN: Shortcut — focus existing window or create immediately (no tabs.query before create). */
async function launchBmxtPopupFromShortcutAsync(): Promise<void> {
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

/**
 * EN: `launch-bmxt` / toolbar — popup open/focus, or float show/hide when switchwindow chose float.
 * JA: 起動ショートカット。popup は開く／前面、float モードは表示／非表示トグル（popup は出さない）。
 */
async function launchBmxtFromShortcutAsync(): Promise<void> {
  const host = await loadPromptLaunchHostAsync()
  if (host === "float") {
    markLaunchPhase("resolve-window-start")
    await launchOrToggleFloatFromShortcutAsync()
    markLaunchPhase("focus-window-done")
    return
  }
  await launchBmxtPopupFromShortcutAsync()
}

async function resetBmxtFromShortcutAsync(): Promise<void> {
  const services = await loadBackgroundServicesAsync()
  const host = await loadPromptLaunchHostAsync()
  if (host === "float") {
    await services.resetBmxtFromShortcutAsync(async () => {
      await showFloatOnLaunchTargetAsync()
    })
    return
  }
  await services.resetBmxtFromShortcutAsync(openOrFocusBmxtWindowAsync)
}

function openOrFocusBmxtWindow(): void {
  void loadBackgroundServicesAsync()
  enqueueBmxtWindowLaunch(() => launchBmxtFromShortcutAsync())
}

export function setupWindowLaunch(): void {
  setupBmxtWindowBoundsTracking()
  setupFloatLaunch(chrome.commands.onCommand)

  chrome.windows.onRemoved.addListener((windowId) => {
    if (readBmxtWindowIdInMemory() !== windowId) {
      return
    }
    flushPersistBmxtWindowBounds()
    clearBmxtWindowIdInMemory()
    void persistBmxtWindowId(undefined)
    broadcastSessionClearToUi("popup")
    void loadBackgroundServicesAsync().then((services) =>
      services.removeAllTerminalSessionsFromStorageAsync()
    )
  })

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
