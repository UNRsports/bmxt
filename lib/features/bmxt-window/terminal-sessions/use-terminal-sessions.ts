import { useCallback, useEffect, useRef, useState } from "react"
import { deriveDefaultSessionName } from "../../session/session-summary"
import {
  applySessionPatch,
  applySessionPatches,
  type ApplySessionPatchContext,
  type SessionPatch
} from "./session-patches"
import {
  appendLinesToSessionState,
  createEmptyTerminalSessionsState,
  resolveExplicitOrSanitizedSessionName,
  setActiveSessionState,
  setSessionDisplayNameState
} from "./session-state-ops"
import { SESSION_CLEAR_MESSAGE, isSessionRuntimeOutboundMessage } from "./session-runtime-protocol"
import type { TerminalSessionsStateV1 } from "./types"

export function useTerminalSessions(sessionContext?: ApplySessionPatchContext): {
  state: TerminalSessionsStateV1
  appendLogLines: (sessionId: string, lines: string[]) => void
  setActiveSession: (sessionId: string) => void
  setSessionDisplayName: (sessionId: string, name: string) => void
  applyRunCmdPatches: (patches: readonly SessionPatch[]) => void
  resetSessions: () => void
} {
  const [state, setState] = useState<TerminalSessionsStateV1>(() =>
    createEmptyTerminalSessionsState()
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const sessionContextRef = useRef(sessionContext)
  sessionContextRef.current = sessionContext

  const commitState = useCallback((next: TerminalSessionsStateV1) => {
    setState(next)
  }, [])

  useEffect(() => {
    const onRuntimeMessage: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message
    ) => {
      if (!isSessionRuntimeOutboundMessage(message)) {
        return
      }
      if (message.type === SESSION_CLEAR_MESSAGE) {
        commitState(createEmptyTerminalSessionsState())
      }
    }
    chrome.runtime.onMessage.addListener(onRuntimeMessage)
    return () => chrome.runtime.onMessage.removeListener(onRuntimeMessage)
  }, [commitState])

  const appendLogLines = useCallback(
    (sessionId: string, lines: string[]) => {
      if (lines.length === 0) {
        return
      }
      setState((prev) => appendLinesToSessionState(prev, sessionId, lines))
    },
    []
  )

  const setActiveSession = useCallback((sessionId: string) => {
    setState((prev) => {
      const next = setActiveSessionState(prev, sessionId)
      return next ?? prev
    })
  }, [])

  const setSessionDisplayName = useCallback((sessionId: string, name: string) => {
    setState((prev) => {
      const next = setSessionDisplayNameState(prev, sessionId, name)
      return next ?? prev
    })
  }, [])

  const applyRunCmdPatches = useCallback(
    (patches: readonly SessionPatch[]) => {
      if (patches.length === 0) {
        return
      }
      setState((prev) => applySessionPatches(prev, patches, sessionContextRef.current))
    },
    []
  )

  const resetSessions = useCallback(() => {
    commitState(createEmptyTerminalSessionsState())
  }, [commitState])

  return {
    state,
    appendLogLines,
    setActiveSession,
    setSessionDisplayName,
    applyRunCmdPatches,
    resetSessions
  }
}

export function buildDefaultNewSessionName(
  fromSessionId: string,
  explicitName: string | undefined,
  state: TerminalSessionsStateV1,
  pickers?: Parameters<typeof deriveDefaultSessionName>[0]["pickers"],
  navArmed?: boolean
): string {
  const sanitized = resolveExplicitOrSanitizedSessionName(explicitName)
  if (sanitized) {
    return sanitized
  }
  return deriveDefaultSessionName({
    pickers,
    navArmed: navArmed ?? false,
    logs: state.logsById[fromSessionId] ?? [],
    fallbackIndex: state.order.length + 1
  })
}

export { applySessionPatch, applySessionPatches }
