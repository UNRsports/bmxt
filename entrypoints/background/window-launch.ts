/**
 * EN: Minimal BMXt window launch (shortcut / toolbar). No command dispatch imports.
 * JA: ショートカット・ツールバー用の軽量起動。コマンド dispatch は読み込まない。
 */

import {
  flushLaunchPerf,
  markLaunchPhase,
  resetLaunchPerf
} from "../../lib/features/launch/launch-perf"
import { loadBackgroundServicesAsync } from "./load-background-services"
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
  await services.resetBmxtFromShortcutAsync(openOrFocusBmxtWindowAsync)
}

function openOrFocusBmxtWindow(): void {
  void loadBackgroundServicesAsync()
  enqueueBmxtWindowLaunch(() => openOrFocusBmxtWindowAsync())
}

export function setupWindowLaunch(): void {
  setupBmxtWindowBoundsTracking()

  chrome.windows.onRemoved.addListener((windowId) => {
    if (readBmxtWindowIdInMemory() !== windowId) {
      return
    }
    flushPersistBmxtWindowBounds()
    clearBmxtWindowIdInMemory()
    void persistBmxtWindowId(undefined)
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
