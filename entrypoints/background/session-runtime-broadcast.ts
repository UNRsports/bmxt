/**
 * EN: In-memory session store + runtime.sendMessage broadcasts to BMXt UI.
 * JA: メモリ上のセッション状態と UI 向けブロードキャスト。
 */

import {
  enableInMemorySessionRuntime,
  ensureTerminalSessionsState
} from "../../lib/features/bmxt-window/terminal-sessions/state-storage"
import {
  SESSION_CLEAR_MESSAGE,
  SESSION_SNAPSHOT_MESSAGE
} from "../../lib/features/bmxt-window/terminal-sessions/session-runtime-protocol"
import type { TerminalSessionsStateV1 } from "../../lib/features/bmxt-window/terminal-sessions/types"

function broadcastSessionSnapshot(state: TerminalSessionsStateV1): void {
  void chrome.runtime.sendMessage({
    type: SESSION_SNAPSHOT_MESSAGE,
    state
  })
}

function broadcastSessionClear(): void {
  void chrome.runtime.sendMessage({ type: SESSION_CLEAR_MESSAGE })
}

export function setupInMemorySessionRuntime(): void {
  enableInMemorySessionRuntime({
    onStateChange: broadcastSessionSnapshot,
    onClear: broadcastSessionClear
  })
}

export async function readSessionSnapshotForInit(): Promise<TerminalSessionsStateV1> {
  return ensureTerminalSessionsState()
}
