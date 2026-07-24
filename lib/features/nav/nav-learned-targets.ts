/**
 * EN: Origin-scoped learned nav identity keys (session cache + chrome.storage.local).
 * JA: origin 単位の学習済み識別キー（メモリ + chrome.storage.local）。
 */

import { NAV_LEARNED_TARGETS_KEY } from "../extension-storage/keys"

export type NavLearnedEntry = {
  kind: string
  key: string
  /** EN: unix ms */
  lastUsedAt: number
}

export type NavLearnedStore = {
  version: 1
  byOrigin: Record<string, NavLearnedEntry[]>
}

const MAX_KEYS_PER_ORIGIN = 100
const MAX_ORIGINS = 80

let memoryCache: NavLearnedStore | null = null

function emptyStore(): NavLearnedStore {
  return { version: 1, byOrigin: {} }
}

function isValidEntry(raw: unknown): raw is NavLearnedEntry {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as Record<string, unknown>
  return (
    typeof o.kind === "string" &&
    o.kind.length > 0 &&
    o.kind.length <= 40 &&
    typeof o.key === "string" &&
    o.key.length > 0 &&
    o.key.length <= 512 &&
    typeof o.lastUsedAt === "number" &&
    Number.isFinite(o.lastUsedAt)
  )
}

export function sanitizeNavLearnedStore(raw: unknown): NavLearnedStore {
  if (!raw || typeof raw !== "object") {
    return emptyStore()
  }
  const o = raw as Record<string, unknown>
  if (o.version !== 1 || !o.byOrigin || typeof o.byOrigin !== "object") {
    return emptyStore()
  }
  const byOrigin: Record<string, NavLearnedEntry[]> = {}
  const origins = Object.keys(o.byOrigin as Record<string, unknown>).slice(0, MAX_ORIGINS)
  for (const origin of origins) {
    if (origin.length === 0 || origin.length > 512) {
      continue
    }
    const list = (o.byOrigin as Record<string, unknown>)[origin]
    if (!Array.isArray(list)) {
      continue
    }
    const entries = list.filter(isValidEntry).slice(0, MAX_KEYS_PER_ORIGIN)
    if (entries.length > 0) {
      byOrigin[origin] = entries
    }
  }
  return { version: 1, byOrigin }
}

async function readStore(): Promise<NavLearnedStore> {
  if (memoryCache) {
    return memoryCache
  }
  try {
    const got = await chrome.storage.local.get(NAV_LEARNED_TARGETS_KEY)
    const store = sanitizeNavLearnedStore(got[NAV_LEARNED_TARGETS_KEY])
    memoryCache = store
    return store
  } catch {
    memoryCache = emptyStore()
    return memoryCache
  }
}

async function writeStore(store: NavLearnedStore): Promise<void> {
  memoryCache = store
  try {
    await chrome.storage.local.set({ [NAV_LEARNED_TARGETS_KEY]: store })
  } catch {
    /* storage unavailable — keep memory */
  }
}

export async function listNavLearnedKeysForOrigin(origin: string): Promise<string[]> {
  if (origin.length === 0) {
    return []
  }
  const store = await readStore()
  const entries = store.byOrigin[origin] ?? []
  return entries.map((e) => e.key)
}

export async function recordNavLearnedTarget(
  origin: string,
  kind: string,
  key: string
): Promise<void> {
  const o = origin.trim()
  const k = key.trim()
  const kindTrim = kind.trim()
  if (o.length === 0 || o.length > 512 || k.length === 0 || k.length > 512 || kindTrim.length === 0) {
    return
  }
  if (kindTrim === "inert") {
    return
  }
  const store = await readStore()
  const now = Date.now()
  const prev = store.byOrigin[o] ?? []
  const next: NavLearnedEntry[] = [{ kind: kindTrim, key: k, lastUsedAt: now }]
  for (const e of prev) {
    if (e.key.toLowerCase() === k.toLowerCase() && e.kind === kindTrim) {
      continue
    }
    next.push(e)
  }
  next.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  const trimmed = next.slice(0, MAX_KEYS_PER_ORIGIN)

  const origins = Object.keys(store.byOrigin).filter((x) => x !== o)
  origins.sort((a, b) => {
    const la = store.byOrigin[a]?.[0]?.lastUsedAt ?? 0
    const lb = store.byOrigin[b]?.[0]?.lastUsedAt ?? 0
    return lb - la
  })
  const byOrigin: Record<string, NavLearnedEntry[]> = { [o]: trimmed }
  for (const originKey of origins.slice(0, MAX_ORIGINS - 1)) {
    const list = store.byOrigin[originKey]
    if (list) {
      byOrigin[originKey] = list
    }
  }
  await writeStore({ version: 1, byOrigin })
}

/** EN: Drop a stale key after jump miss or activate failure. */
export async function forgetNavLearnedTarget(origin: string, key: string): Promise<void> {
  const o = origin.trim()
  const k = key.trim().toLowerCase()
  if (o.length === 0 || k.length === 0) {
    return
  }
  const store = await readStore()
  const prev = store.byOrigin[o]
  if (!prev) {
    return
  }
  const next = prev.filter((e) => e.key.toLowerCase() !== k)
  const byOrigin = { ...store.byOrigin }
  if (next.length === 0) {
    delete byOrigin[o]
  } else {
    byOrigin[o] = next
  }
  await writeStore({ version: 1, byOrigin })
}

/** EN: Test helper — clear in-memory cache. */
export function resetNavLearnedMemoryCacheForTests(): void {
  memoryCache = null
}
