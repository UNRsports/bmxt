/**
 * EN: Sessions + browse payload carried on RUN_CMD for host migration (`switchwindow`).
 * JA: `switchwindow` 用に RUN_CMD へ載せるセッション／ブラウズ・スナップショット。
 */

import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"
import { isTerminalSessionsStateV1 } from "./float-terminal-session-storage.ts"
import {
  createEmptyFloatBrowseState,
  isFloatBrowseStateV1,
  parseFloatBrowseState,
  type FloatBrowseStateV1
} from "./float-browse-state-storage.ts"
import type { HostUiFormFactor } from "../setting/host-ui-mode.ts"

export type HostSwitchSnapshot = {
  sessions: TerminalSessionsStateV1
  browse: FloatBrowseStateV1
  /** EN: Float host tab id when the command runs in the float iframe. */
  floatTabId?: number
  /** EN: Effective host UI form factor (blocks popup→float on mobile). */
  hostUiFormFactor?: HostUiFormFactor
}

export function isHostSwitchSnapshot(value: unknown): value is HostSwitchSnapshot {
  if (!value || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  if (!isTerminalSessionsStateV1(o.sessions)) {
    return false
  }
  if (!isFloatBrowseStateV1(o.browse)) {
    return false
  }
  if (o.floatTabId !== undefined) {
    if (typeof o.floatTabId !== "number" || !Number.isInteger(o.floatTabId) || o.floatTabId < 0) {
      return false
    }
  }
  if (o.hostUiFormFactor !== undefined) {
    if (o.hostUiFormFactor !== "desktop" && o.hostUiFormFactor !== "mobile") {
      return false
    }
  }
  return true
}

export function parseHostSwitchSnapshot(value: unknown): HostSwitchSnapshot | null {
  if (!isHostSwitchSnapshot(value)) {
    return null
  }
  const browse = parseFloatBrowseState(value.browse) ?? createEmptyFloatBrowseState()
  const out: HostSwitchSnapshot = {
    sessions: value.sessions,
    browse
  }
  if (typeof value.floatTabId === "number") {
    out.floatTabId = value.floatTabId
  }
  if (value.hostUiFormFactor === "desktop" || value.hostUiFormFactor === "mobile") {
    out.hostUiFormFactor = value.hostUiFormFactor
  }
  return out
}

export function appendLinesToHostSnapshot(
  snapshot: HostSwitchSnapshot,
  sessionId: string,
  lines: readonly string[]
): HostSwitchSnapshot {
  if (lines.length === 0) {
    return snapshot
  }
  const id = snapshot.sessions.order.includes(sessionId)
    ? sessionId
    : snapshot.sessions.activeId
  const prev = snapshot.sessions.logsById[id] ?? []
  return {
    ...snapshot,
    sessions: {
      ...snapshot.sessions,
      logsById: {
        ...snapshot.sessions.logsById,
        [id]: [...prev, ...lines]
      }
    }
  }
}
