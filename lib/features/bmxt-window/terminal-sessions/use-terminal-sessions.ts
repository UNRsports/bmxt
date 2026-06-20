import { useCallback, useEffect, useRef, useState } from "react"
import { TERMINAL_SESSIONS_KEY } from "../../extension-storage/keys"
import { getSessionLogCache, seedSessionLogCache, useSessionLogSync } from "../../session-log"
import {
  mergeSessionsStatePreservingStableRefs,
  sessionsUiSnapshotEqual
} from "./sessions-ui-equality"
import {
  createEmptyTerminalSessionsState,
  ensureTerminalSessionsState,
  parseTerminalSessionsStorageValue,
  readTerminalSessionsIfPresent,
  setActiveSession,
  setSessionDisplayName
} from "./state-storage"
import type { TerminalSessionsStateV1 } from "./types"

function bootstrapTerminalSessionsState(): TerminalSessionsStateV1 {
  const cached = getSessionLogCache()
  if (cached) {
    return cached
  }
  const optimistic = createEmptyTerminalSessionsState()
  seedSessionLogCache(optimistic)
  return optimistic
}

function applySessionsState(
  prev: TerminalSessionsStateV1,
  next: TerminalSessionsStateV1
): TerminalSessionsStateV1 {
  const merged = mergeSessionsStatePreservingStableRefs(prev, next)
  return sessionsUiSnapshotEqual(prev, merged) ? prev : merged
}

export function useTerminalSessions(): {
  state: TerminalSessionsStateV1
  setActiveSession: (sessionId: string) => Promise<void>
  setSessionDisplayName: (sessionId: string, name: string) => Promise<void>
} {
  const [state, setState] = useState<TerminalSessionsStateV1>(bootstrapTerminalSessionsState)
  const stateRef = useRef<TerminalSessionsStateV1>(state)
  stateRef.current = state

  const commitSessionsState = useCallback((next: TerminalSessionsStateV1 | null) => {
    if (!next) {
      const fresh = createEmptyTerminalSessionsState()
      seedSessionLogCache(fresh)
      setState(fresh)
      return
    }
    setState((prev) => applySessionsState(prev, next))
  }, [])

  useSessionLogSync({ onState: commitSessionsState })

  useEffect(() => {
    void readTerminalSessionsIfPresent().then((s) => {
      if (s) {
        commitSessionsState(s)
        return
      }
      void ensureTerminalSessionsState().then(commitSessionsState)
    })

    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      const change = changes[TERMINAL_SESSIONS_KEY]
      if (!change) {
        return
      }
      if (change.newValue === undefined) {
        void ensureTerminalSessionsState().then(commitSessionsState)
        return
      }
      const parsed = parseTerminalSessionsStorageValue(change.newValue)
      if (parsed) {
        commitSessionsState(parsed)
        return
      }
      void readTerminalSessionsIfPresent().then((s) => {
        if (s) {
          commitSessionsState(s)
        } else {
          void ensureTerminalSessionsState().then(commitSessionsState)
        }
      })
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [commitSessionsState])

  const activateSession = useCallback(async (sessionId: string) => {
    setState((prev) => {
      if (prev.order.includes(sessionId) && prev.activeId !== sessionId) {
        return { ...prev, activeId: sessionId }
      }
      return prev
    })
    const next = await setActiveSession(sessionId)
    if (next) {
      commitSessionsState(next)
    }
  }, [commitSessionsState])

  const renameSession = useCallback(async (sessionId: string, name: string) => {
    const next = await setSessionDisplayName(sessionId, name)
    if (next) {
      commitSessionsState(next)
    }
  }, [commitSessionsState])

  return {
    state,
    setActiveSession: activateSession,
    setSessionDisplayName: renameSession
  }
}
