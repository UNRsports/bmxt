import { ACTIVE_TERMINAL_SESSION_KEY, TERMINAL_SESSIONS_KEY } from "../../extension-storage/keys"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  addTerminalSession,
  appendLinesToSession,
  closeTerminalSessionUi,
  ensureTerminalSessionsState,
  readTerminalSessionsIfPresent,
  setActiveSession
} from "./state-storage"
import type { TerminalSessionsStateV1 } from "./types"

export function useTerminalSessions(): {
  state: TerminalSessionsStateV1 | null
  activeSessionId: string | null
  activeLines: string[] | null
  appendLogLines: (newLines: string[]) => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  addSession: () => Promise<void>
  closeSession: (sessionId: string) => Promise<void>
} {
  const [state, setState] = useState<TerminalSessionsStateV1 | null>(null)
  const activeIdRef = useRef<string | null>(null)

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
      if (!changes[TERMINAL_SESSIONS_KEY] && !changes[ACTIVE_TERMINAL_SESSION_KEY]) {
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

  useEffect(() => {
    activeIdRef.current = state?.activeId ?? null
  }, [state?.activeId])

  const appendLogLines = useCallback(async (newLines: string[]) => {
    const id = activeIdRef.current
    if (!id) {
      return
    }
    await appendLinesToSession(id, newLines)
  }, [])

  const selectSession = useCallback(async (sessionId: string) => {
    const next = await setActiveSession(sessionId)
    if (next) {
      setState(next)
    }
  }, [])

  const addSession = useCallback(async () => {
    const next = await addTerminalSession()
    setState(next)
  }, [])

  const closeSession = useCallback(async (sessionId: string) => {
    const next = await closeTerminalSessionUi(sessionId)
    if (next) {
      setState(next)
    }
  }, [])

  const activeLines =
    state && state.activeId ? (state.logsById[state.activeId] ?? []) : null

  return {
    state,
    activeSessionId: state?.activeId ?? null,
    activeLines,
    appendLogLines,
    selectSession,
    addSession,
    closeSession
  }
}
