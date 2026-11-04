/**
 * EN: Shared BMXt popup window id + create/focus (no command dispatch).
 * JA: BMXt ポップアップ窓 ID と create/focus の共有処理。
 */

import { BMXT_WINDOW_ID_KEY } from "../../lib/features/extension-storage/keys"
import { loadBmxtWindowBoundsAsync } from "./window-bounds"

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
  const bounds = await loadBmxtWindowBoundsAsync()
  const w = await chrome.windows.create({
    url,
    type: "popup",
    width: bounds.width,
    height: bounds.height,
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

function isBmxtShellTabUrl(url: string | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) {
    return false
  }
  // EN: Match shell only — not float / action trampoline.
  // JA: シェルタブのみ（float / 起動 trampoline は除外）。
  try {
    const parsed = new URL(url)
    return parsed.pathname === `/${BMXT_PAGE}` || parsed.pathname === BMXT_PAGE
  } catch {
    return false
  }
}

async function listBmxtShellTabsAsync(): Promise<chrome.tabs.Tab[]> {
  const exact = chrome.runtime.getURL(BMXT_PAGE)
  try {
    const byExact = await chrome.tabs.query({ url: exact })
    if (byExact.length > 0) {
      return byExact
    }
  } catch {
    /* fall through — Android may reject some url filters */
  }
  try {
    const byPattern = await chrome.tabs.query({ url: "*://*/bmxt.html" })
    return byPattern.filter((tab) => isBmxtShellTabUrl(tab.url))
  } catch {
    /* fall through */
  }
  const all = await chrome.tabs.query({})
  return all.filter((tab) => isBmxtShellTabUrl(tab.url))
}

/**
 * EN: Firefox SP tab shell — open or focus `bmxt.html` as a normal browser tab.
 * JA: Firefox SP タブシェル — bmxt.html を通常タブで開く／フォーカスする。
 */
export async function openOrFocusBmxtShellTabAsync(): Promise<void> {
  const url = chrome.runtime.getURL(BMXT_PAGE)
  const existing = await listBmxtShellTabsAsync()
  for (const tab of existing) {
    if (typeof tab.id !== "number") {
      continue
    }
    await chrome.tabs.update(tab.id, { active: true })
    if (typeof tab.windowId === "number" && chrome.windows?.update) {
      try {
        await chrome.windows.update(tab.windowId, { focused: true })
      } catch {
        /* Firefox Android has no windows API */
      }
    }
    return
  }
  await chrome.tabs.create({ url })
}

/** EN: Close every open `bmxt.html` tab (Firefox tab-shell exit). */
export async function closeBmxtShellTabsAsync(): Promise<void> {
  const existing = await listBmxtShellTabsAsync()
  const ids: number[] = []
  for (const tab of existing) {
    if (typeof tab.id === "number") {
      ids.push(tab.id)
    }
  }
  if (ids.length === 0) {
    return
  }
  try {
    await chrome.tabs.remove(ids)
  } catch {
    /* already closed */
  }
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
