import { useCallback, useEffect, useRef, useState } from "react"
import {
  mergeSessionsStatePreservingStableRefs,
  sessionsUiSnapshotEqual
} from "./sessions-ui-equality"
import {
  isSessionRuntimeOutboundMessage,
  SESSION_CLEAR_MESSAGE
} from "./session-runtime-protocol"
import {
  initSessionRuntimeFromPageAsync,
  setActiveSessionFromUiAsync,
  setSessionNameFromUiAsync
} from "./session-runtime-client"
import type { TerminalSessionsStateV1 } from "./types"

function applySessionsState(
  prev: TerminalSessionsStateV1 | null,
  next: TerminalSessionsStateV1 | null
): TerminalSessionsStateV1 | null {
  if (!next) {
    return null
  }
  if (!prev) {
    return next
  }
  const merged = mergeSessionsStatePreservingStableRefs(prev, next)
  return sessionsUiSnapshotEqual(prev, merged) ? prev : merged
}

export function useTerminalSessions(): {
  state: TerminalSessionsStateV1 | null
  setActiveSession: (sessionId: string) => Promise<void>
  setSessionDisplayName: (sessionId: string, name: string) => Promise<void>
} {
  const [state, setState] = useState<TerminalSessionsStateV1 | null>(null)
  const stateRef = useRef<TerminalSessionsStateV1 | null>(null)
  stateRef.current = state

  const commitSessionsState = useCallback((next: TerminalSessionsStateV1 | null) => {
    setState((prev) => applySessionsState(prev, next))
  }, [])

  useEffect(() => {
    let cancelled = false
    void initSessionRuntimeFromPageAsync()
      .then((snapshot) => {
        if (!cancelled) {
          commitSessionsState(snapshot)
        }
      })
      .catch(() => {
        if (!cancelled) {
          commitSessionsState(null)
        }
      })

    const onRuntimeMessage: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message
    ) => {
      if (!isSessionRuntimeOutboundMessage(message)) {
        return
      }
      if (message.type === SESSION_CLEAR_MESSAGE) {
        commitSessionsState(null)
        return
      }
      commitSessionsState(message.state)
    }
    chrome.runtime.onMessage.addListener(onRuntimeMessage)
    return () => {
      cancelled = true
      chrome.runtime.onMessage.removeListener(onRuntimeMessage)
    }
  }, [commitSessionsState])

  const activateSession = useCallback(
    async (sessionId: string) => {
      const prev = stateRef.current
      if (prev && prev.order.includes(sessionId) && prev.activeId !== sessionId) {
        commitSessionsState({ ...prev, activeId: sessionId })
      }
      try {
        await setActiveSessionFromUiAsync(sessionId)
      } catch {
        /* snapshot broadcast restores authoritative activeId */
      }
    },
    [commitSessionsState]
  )

  const renameSession = useCallback(
    async (sessionId: string, name: string) => {
      try {
        await setSessionNameFromUiAsync(sessionId, name)
      } catch {
        /* snapshot broadcast restores authoritative names */
      }
    },
    []
  )

  return {
    state,
    setActiveSession: activateSession,
    setSessionDisplayName: renameSession
  }
}
