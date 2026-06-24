/**
 * EN: Shared BMXt popup window id + create/focus (no command dispatch).
 * JA: BMXt ポップアップ窓 ID と create/focus の共有処理。
 */

import { BMXT_WINDOW_ID_KEY } from "../../lib/features/extension-storage/keys"

/** WXT unlisted page path for the BMXt UI. */
export const BMXT_PAGE = "bmxt.html"

let bmxtWindowId: number | undefined

export async function persistBmxtWindowId(id: number | undefined): Promise<void> {
  if (id === undefined) {
    await chrome.storage.local.remove(BMXT_WINDOW_ID_KEY)
    return
  }
  await chrome.storage.local.set({ [BMXT_WINDOW_ID_KEY]: id })
}

export async function hydrateBmxtWindowIdFromStorage(): Promise<void> {
  if (bmxtWindowId !== undefined) {
    return
  }
  const r = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
  const id = r[BMXT_WINDOW_ID_KEY]
  if (typeof id === "number" && Number.isInteger(id)) {
    bmxtWindowId = id
  }
}

export async function focusBmxtWindow(windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true })
}

export async function createBmxtWindowAsync(): Promise<number | undefined> {
  const url = chrome.runtime.getURL(BMXT_PAGE)
  const w = await chrome.windows.create({
    url,
    type: "popup",
    width: 780,
    height: 580,
    focused: true
  })
  if (w.id !== undefined) {
    bmxtWindowId = w.id
    void persistBmxtWindowId(w.id)
  }
  return w.id
}

/**
 * EN: Memory + one storage read. Skips tabs.query on the hot path.
 */
export async function resolveBmxtWindowIdFastAsync(): Promise<number | undefined> {
  if (bmxtWindowId !== undefined) {
    try {
      await chrome.windows.get(bmxtWindowId)
      return bmxtWindowId
    } catch {
      bmxtWindowId = undefined
      void persistBmxtWindowId(undefined)
    }
  }
  const r = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
  const storedId = r[BMXT_WINDOW_ID_KEY]
  if (typeof storedId !== "number" || !Number.isInteger(storedId)) {
    return undefined
  }
  try {
    await chrome.windows.get(storedId)
    bmxtWindowId = storedId
    return storedId
  } catch {
    void persistBmxtWindowId(undefined)
    return undefined
  }
}

export async function openOrFocusBmxtWindowAsync(): Promise<void> {
  const existingId = await resolveBmxtWindowIdFastAsync()
  if (existingId !== undefined) {
    await focusBmxtWindow(existingId)
    return
  }
  await createBmxtWindowAsync()
}

/** EN: Close duplicate if another bmxt.html window existed (SW slept, stale storage). */
export async function reconcileDuplicateBmxtWindowsAsync(createdWindowId: number): Promise<void> {
  const pageUrl = chrome.runtime.getURL(BMXT_PAGE)
  const tabs = await chrome.tabs.query({ url: pageUrl })
  let existingWindowId: number | undefined
  for (const tab of tabs) {
    if (typeof tab.windowId === "number" && tab.windowId !== createdWindowId) {
      existingWindowId = tab.windowId
      break
    }
  }
  if (existingWindowId === undefined) {
    return
  }
  try {
    await focusBmxtWindow(existingWindowId)
    bmxtWindowId = existingWindowId
    void persistBmxtWindowId(existingWindowId)
    await chrome.windows.remove(createdWindowId)
  } catch {
    /* keep the window we just opened */
  }
}

export function readBmxtWindowIdForTests(): number | undefined {
  return bmxtWindowId
}

export function setBmxtWindowIdForTests(id: number | undefined): void {
  bmxtWindowId = id
}

export function clearBmxtWindowIdInMemory(): void {
  bmxtWindowId = undefined
}

export function readBmxtWindowIdInMemory(): number | undefined {
  return bmxtWindowId
}
