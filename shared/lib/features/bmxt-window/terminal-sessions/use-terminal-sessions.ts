import { useCallback, useEffect, useRef, useState } from "react"
import {
  encodeLogLines,
  type LogChannel
} from "../../command-line/command-output.ts"
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
import {
  sessionClearAppliesToHost,
  type BmxtHostKind
} from "../bmxt-host-kind"
import { SESSION_CLEAR_MESSAGE, isSessionRuntimeOutboundMessage } from "./session-runtime-protocol"
import type { TerminalSessionsStateV1 } from "./types"

export function useTerminalSessions(
  sessionContext?: ApplySessionPatchContext,
  hostKind: BmxtHostKind = "popup"
): {
  state: TerminalSessionsStateV1
  sessionsReady: boolean
  appendLogLines: (sessionId: string, lines: string[], channel?: LogChannel) => void
  setActiveSession: (sessionId: string) => void
  setSessionDisplayName: (sessionId: string, name: string) => void
  applyRunCmdPatches: (patches: readonly SessionPatch[]) => void
  resetSessions: () => void
} {
  const [state, setState] = useState<TerminalSessionsStateV1>(() =>
    createEmptyTerminalSessionsState()
  )
  // EN: Popup is in-memory only — sessions are always ready immediately.
  // JA: ポップアップはインメモリのみ。セッションは常に即座に準備完了。
  const sessionsReady = true
  const stateRef = useRef(state)
  stateRef.current = state
  const sessionContextRef = useRef(sessionContext)
  sessionContextRef.current = sessionContext
  const hostKindRef = useRef(hostKind)
  hostKindRef.current = hostKind

  const commitState = useCallback((next: TerminalSessionsStateV1) => {
    stateRef.current = next
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
        if (!sessionClearAppliesToHost(message.host, hostKindRef.current)) {
          return
        }
        commitState(createEmptyTerminalSessionsState())
      }
    }
    chrome.runtime.onMessage.addListener(onRuntimeMessage)
    return () => chrome.runtime.onMessage.removeListener(onRuntimeMessage)
  }, [commitState])

  const appendLogLines = useCallback(
    (sessionId: string, lines: string[], channel: LogChannel = "stdout") => {
      if (lines.length === 0) {
        return
      }
      const encoded = encodeLogLines(lines, channel)
      setState((prev) => {
        const next = appendLinesToSessionState(prev, sessionId, encoded)
        stateRef.current = next
        return next
      })
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
      setState((prev) => {
        const next = applySessionPatches(prev, patches, sessionContextRef.current)
        stateRef.current = next
        return next
      })
    },
    []
  )

  const resetSessions = useCallback(() => {
    commitState(createEmptyTerminalSessionsState())
  }, [commitState])

  return {
    state,
    sessionsReady,
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
