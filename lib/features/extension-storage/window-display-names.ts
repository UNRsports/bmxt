import { invalidatePickerChromeContextCache } from "../tabs/picker-chrome-context"
import { WINDOW_DISPLAY_NAMES_KEY } from "./keys"
import {
  parseWindowDisplayNamesStore,
  pruneWindowDisplayNamesStore,
  type WindowDisplayNamesStore,
  windowDisplayNamesMapFromStore
} from "./window-display-names-store"

async function readStore(): Promise<WindowDisplayNamesStore> {
  const r = await chrome.storage.local.get(WINDOW_DISPLAY_NAMES_KEY)
  return parseWindowDisplayNamesStore(r[WINDOW_DISPLAY_NAMES_KEY])
}

export async function getWindowDisplayNamesMap(): Promise<Map<number, string>> {
  const store = await readStore()
  return windowDisplayNamesMapFromStore(store)
}

export async function getWindowDisplayName(windowId: number): Promise<string | undefined> {
  const store = await readStore()
  const v = store[String(windowId)]
  if (typeof v !== "string") {
    return undefined
  }
  const t = v.trim()
  return t === "" ? undefined : t
}

export async function setWindowDisplayName(windowId: number, name: string): Promise<void> {
  const store = await readStore()
  const trimmed = name.trim()
  const key = String(windowId)
  if (trimmed === "") {
    delete store[key]
  } else {
    store[key] = trimmed
  }
  await chrome.storage.local.set({ [WINDOW_DISPLAY_NAMES_KEY]: store })
  invalidatePickerChromeContextCache()
}

/** 閉じたウィンドウのエントリを storage から除去する。 */
export async function pruneWindowDisplayNames(openWindowIds: Iterable<number>): Promise<void> {
  const store = await readStore()
  const pruned = pruneWindowDisplayNamesStore(store, openWindowIds)
  if (pruned.changed) {
    await chrome.storage.local.set({ [WINDOW_DISPLAY_NAMES_KEY]: pruned.store })
    invalidatePickerChromeContextCache()
  }
}
