import { WINDOW_DISPLAY_NAMES_KEY } from "./keys"

type Store = Record<string, string>

async function readStore(): Promise<Store> {
  const r = await chrome.storage.local.get(WINDOW_DISPLAY_NAMES_KEY)
  const raw = r[WINDOW_DISPLAY_NAMES_KEY]
  if (!raw || typeof raw !== "object") {
    return {}
  }
  return raw as Store
}

export async function getWindowDisplayNamesMap(): Promise<Map<number, string>> {
  const store = await readStore()
  const out = new Map<number, string>()
  for (const [k, v] of Object.entries(store)) {
    const id = Number(k)
    if (Number.isInteger(id) && typeof v === "string" && v.trim() !== "") {
      out.set(id, v.trim())
    }
  }
  return out
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
}

/** 閉じたウィンドウのエントリを storage から除去する。 */
export async function pruneWindowDisplayNames(openWindowIds: Iterable<number>): Promise<void> {
  const open = new Set(openWindowIds)
  const store = await readStore()
  let changed = false
  for (const k of Object.keys(store)) {
    const id = Number(k)
    if (!open.has(id)) {
      delete store[k]
      changed = true
    }
  }
  if (changed) {
    await chrome.storage.local.set({ [WINDOW_DISPLAY_NAMES_KEY]: store })
  }
}
