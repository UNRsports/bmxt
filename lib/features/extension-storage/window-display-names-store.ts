import { WINDOW_DISPLAY_NAMES_KEY } from "./keys"

export type WindowDisplayNamesStore = Record<string, string>

export function parseWindowDisplayNamesStore(raw: unknown): WindowDisplayNamesStore {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  return raw as WindowDisplayNamesStore
}

export function windowDisplayNamesMapFromStore(
  store: WindowDisplayNamesStore
): Map<number, string> {
  const out = new Map<number, string>()
  for (const [k, v] of Object.entries(store)) {
    const id = Number(k)
    if (Number.isInteger(id) && typeof v === "string" && v.trim() !== "") {
      out.set(id, v.trim())
    }
  }
  return out
}

export function pruneWindowDisplayNamesStore(
  store: WindowDisplayNamesStore,
  openWindowIds: Iterable<number>
): { store: WindowDisplayNamesStore; changed: boolean } {
  const open = new Set(openWindowIds)
  let changed = false
  for (const k of Object.keys(store)) {
    const id = Number(k)
    if (!open.has(id)) {
      delete store[k]
      changed = true
    }
  }
  return { store, changed }
}

export { WINDOW_DISPLAY_NAMES_KEY }
