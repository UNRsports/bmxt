import { getSessionLogCache, invalidateSessionLogCache } from "./cache"

const PERSIST_DEBOUNCE_MS = 150

let persistTimer: ReturnType<typeof setTimeout> | undefined
let persistChain: Promise<void> = Promise.resolve()
let diskWriter: ((state: import("../bmxt-window/terminal-sessions/types").TerminalSessionsStateV1) => Promise<void>) | null =
  null

export function registerSessionLogDiskWriter(
  writer: (state: import("../bmxt-window/terminal-sessions/types").TerminalSessionsStateV1) => Promise<void>
): void {
  diskWriter = writer
}

export function scheduleSessionLogPersist(): void {
  if (persistTimer !== undefined) {
    clearTimeout(persistTimer)
  }
  persistTimer = setTimeout(() => {
    persistTimer = undefined
    persistChain = persistChain.then(() => flushSessionLogPersistInternal())
  }, PERSIST_DEBOUNCE_MS)
}

export async function flushSessionLogPersist(): Promise<void> {
  if (persistTimer !== undefined) {
    clearTimeout(persistTimer)
    persistTimer = undefined
  }
  persistChain = persistChain.then(() => flushSessionLogPersistInternal())
  return persistChain
}

async function flushSessionLogPersistInternal(): Promise<void> {
  const state = getSessionLogCache()
  if (!state || !diskWriter) {
    return
  }
  await diskWriter(state)
}

export async function clearSessionLogPersistState(): Promise<void> {
  if (persistTimer !== undefined) {
    clearTimeout(persistTimer)
    persistTimer = undefined
  }
  await persistChain.catch(() => {})
  persistChain = Promise.resolve()
  invalidateSessionLogCache()
}
