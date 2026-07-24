import { useCallback, useEffect, useRef, useState } from "react"
import {
  encodeLogLines,
  type LogChannel
} from "../../command-line/command-output.ts"
import { deriveDefaultSessionName } from "../../session/session-summary"
import {
  clearFloatTerminalSessionsForTab,
  loadFloatTerminalSessionsForTab,
  saveFloatTerminalSessionsForTab
} from "../../bmxt-float/float-terminal-session-storage.ts"
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
  hostKind: BmxtHostKind = "popup",
  floatTabId: number | null = null
): {
  state: TerminalSessionsStateV1
  sessionsReady: boolean
  appendLogLines: (sessionId: string, lines: string[], channel?: LogChannel) => void
  setActiveSession: (sessionId: string) => void
  setSessionDisplayName: (sessionId: string, name: string) => void
  applyRunCmdPatches: (patches: readonly SessionPatch[]) => void
  resetSessions: () => void
  /** EN: Await writing the current float sessions blob (no-op for popup). */
  flushFloatPersist: () => Promise<void>
} {
  const [state, setState] = useState<TerminalSessionsStateV1>(() =>
    createEmptyTerminalSessionsState()
  )
  const [sessionsReady, setSessionsReady] = useState(hostKind !== "float")
  const stateRef = useRef(state)
  stateRef.current = state
  const sessionContextRef = useRef(sessionContext)
  sessionContextRef.current = sessionContext
  const hostKindRef = useRef(hostKind)
  hostKindRef.current = hostKind
  const floatTabIdRef = useRef(floatTabId)
  floatTabIdRef.current = floatTabId
  const persistReadyRef = useRef(false)

  const commitState = useCallback((next: TerminalSessionsStateV1) => {
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    if (hostKind !== "float") {
      setSessionsReady(true)
      persistReadyRef.current = false
      return
    }
    let cancelled = false
    persistReadyRef.current = false
    setSessionsReady(false)
    const tabId = floatTabId
    if (tabId === null) {
      setSessionsReady(true)
      return
    }
    void loadFloatTerminalSessionsForTab(tabId).then((stored) => {
      if (cancelled) {
        return
      }
      if (stored !== null) {
        commitState(stored)
      }
      persistReadyRef.current = true
      setSessionsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [commitState, floatTabId, hostKind])

  useEffect(() => {
    if (hostKind !== "float" || !sessionsReady || !persistReadyRef.current) {
      return
    }
    const tabId = floatTabIdRef.current
    if (tabId === null) {
      return
    }
    void saveFloatTerminalSessionsForTab(tabId, state)
  }, [hostKind, sessionsReady, state])

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
        const tabId = floatTabIdRef.current
        if (hostKindRef.current === "float" && tabId !== null) {
          void clearFloatTerminalSessionsForTab(tabId)
        }
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

  const flushFloatPersist = useCallback(async () => {
    if (hostKindRef.current !== "float") {
      return
    }
    const tabId = floatTabIdRef.current
    if (tabId === null) {
      return
    }
    if (!persistReadyRef.current) {
      return
    }
    await saveFloatTerminalSessionsForTab(tabId, stateRef.current)
  }, [])

  return {
    state,
    sessionsReady,
    appendLogLines,
    setActiveSession,
    setSessionDisplayName,
    applyRunCmdPatches,
    resetSessions,
    flushFloatPersist
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
