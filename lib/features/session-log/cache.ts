import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types"

let cache: TerminalSessionsStateV1 | null = null
const listeners = new Set<(state: TerminalSessionsStateV1) => void>()

export function getSessionLogCache(): TerminalSessionsStateV1 | null {
  return cache
}

export function setSessionLogCache(state: TerminalSessionsStateV1): void {
  cache = state
  for (const fn of listeners) {
    fn(state)
  }
}

export function subscribeSessionLogCache(
  fn: (state: TerminalSessionsStateV1) => void
): () => void {
  listeners.add(fn)
  if (cache) {
    fn(cache)
  }
  return () => {
    listeners.delete(fn)
  }
}

export function invalidateSessionLogCache(): void {
  cache = null
}
