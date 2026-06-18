import { useCallback, useEffect, useState } from "react"
import { TERMINAL_SESSIONS_KEY } from "../../extension-storage/keys"
import {
  ensureTerminalSessionsState,
  readTerminalSessionsIfPresent,
  setActiveSession,
  setSessionDisplayName
} from "./state-storage"
import type { TerminalSessionsStateV1 } from "./types"

export function useTerminalSessions(): {
  state: TerminalSessionsStateV1 | null
  setActiveSession: (sessionId: string) => Promise<void>
  setSessionDisplayName: (sessionId: string, name: string) => Promise<void>
} {
  const [state, setState] = useState<TerminalSessionsStateV1 | null>(null)

  useEffect(() => {
    void readTerminalSessionsIfPresent().then((s) => {
      if (s) {
        setState(s)
        return
      }
      void ensureTerminalSessionsState().then(setState)
    })

    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      if (!changes[TERMINAL_SESSIONS_KEY]) {
        return
      }
      void readTerminalSessionsIfPresent().then((s) => {
        if (s) {
          setState(s)
        } else {
          void ensureTerminalSessionsState().then(setState)
        }
      })
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const activateSession = useCallback(async (sessionId: string) => {
    const next = await setActiveSession(sessionId)
    if (next) {
      setState(next)
    }
  }, [])

  const renameSession = useCallback(async (sessionId: string, name: string) => {
    const next = await setSessionDisplayName(sessionId, name)
    if (next) {
      setState(next)
    }
  }, [])

  return {
    state,
    setActiveSession: activateSession,
    setSessionDisplayName: renameSession
  }
}
