/**
 * EN: RUN_CMD / dispatch session patches applied on the UI store.
 * JA: RUN_CMD / dispatch が返すセッション patch（UI で適用）。
 */

import { deriveDefaultSessionName } from "../../session/session-summary"
import {
  appendLinesToSessionState,
  createEmptyTerminalSessionsState,
  createSessionAndActivateState,
  exitSessionState,
  resolveExplicitOrSanitizedSessionName,
  setActiveSessionState,
  setSessionDisplayNameState,
  setSessionLinesState,
  switchSessionNextState,
  switchSessionPrevState
} from "./session-state-ops"
import type { TerminalSessionsStateV1 } from "./types"

export type SessionPatch =
  | { type: "appendLog"; sessionId: string; lines: string[] }
  | { type: "setLog"; sessionId: string; lines: string[] }
  | { type: "setActive"; sessionId: string }
  | {
      type: "createSession"
      fromSessionId: string
      name?: string
    }
  | { type: "switchNext"; anchorSessionId: string }
  | { type: "switchPrev"; anchorSessionId: string }
  | { type: "exitSession"; sessionId: string; appendExitLog?: boolean }
  | { type: "renameSession"; sessionId: string; name: string }
  | { type: "resetSessions" }

export type RunCmdSuccess = {
  ok: true
  patches: SessionPatch[]
  closeWindow?: boolean
}

export type RunCmdFailure = {
  ok: false
  error: string
}

export type RunCmdResult = RunCmdSuccess | RunCmdFailure

export type ApplySessionPatchContext = {
  deriveNewSessionName?: (
    fromSessionId: string,
    explicitName: string | undefined,
    state: TerminalSessionsStateV1
  ) => string
}

function defaultNewSessionName(
  fromSessionId: string,
  explicitName: string | undefined,
  state: TerminalSessionsStateV1
): string {
  const sanitized = resolveExplicitOrSanitizedSessionName(explicitName)
  if (sanitized) {
    return sanitized
  }
  return deriveDefaultSessionName({
    pickers: undefined,
    navArmed: false,
    logs: state.logsById[fromSessionId] ?? [],
    fallbackIndex: state.order.length + 1
  })
}

export function applySessionPatch(
  state: TerminalSessionsStateV1,
  patch: SessionPatch,
  ctx: ApplySessionPatchContext = {}
): TerminalSessionsStateV1 {
  const deriveName = ctx.deriveNewSessionName ?? defaultNewSessionName

  switch (patch.type) {
    case "appendLog":
      return appendLinesToSessionState(state, patch.sessionId, patch.lines)
    case "setLog":
      return setSessionLinesState(state, patch.sessionId, patch.lines)
    case "setActive": {
      const next = setActiveSessionState(state, patch.sessionId)
      return next ?? state
    }
    case "createSession": {
      const name = deriveName(patch.fromSessionId, patch.name, state)
      return createSessionAndActivateState(state, patch.fromSessionId, name)
    }
    case "switchNext":
      return switchSessionNextState(state, patch.anchorSessionId)
    case "switchPrev":
      return switchSessionPrevState(state, patch.anchorSessionId)
    case "exitSession": {
      const result = exitSessionState(state, patch.sessionId)
      if (patch.appendExitLog && !result.fullClose && "activeIdAfter" in result) {
        return appendLinesToSessionState(result.state, result.activeIdAfter, [`> exit`])
      }
      return result.state
    }
    case "renameSession": {
      const next = setSessionDisplayNameState(state, patch.sessionId, patch.name)
      return next ?? state
    }
    case "resetSessions":
      return createEmptyTerminalSessionsState()
    default: {
      const _exhaustive: never = patch
      return state
    }
  }
}

export function applySessionPatches(
  state: TerminalSessionsStateV1,
  patches: readonly SessionPatch[],
  ctx: ApplySessionPatchContext = {}
): TerminalSessionsStateV1 {
  let cur = state
  for (const patch of patches) {
    cur = applySessionPatch(cur, patch, ctx)
  }
  return cur
}

export function isRunCmdResult(value: unknown): value is RunCmdResult {
  if (!value || typeof value !== "object") {
    return false
  }
  return "ok" in value && typeof (value as { ok?: unknown }).ok === "boolean"
}
