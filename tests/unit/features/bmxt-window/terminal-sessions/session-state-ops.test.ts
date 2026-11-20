import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  decodeLogLine,
  STDERR_LOG_PREFIX
} from "../../../../../shared/lib/features/command-line/command-output.ts"
import {
  appendLinesToSessionState,
  createEmptyTerminalSessionsState,
  exitSessionState
} from "../../../../../shared/lib/features/bmxt-window/terminal-sessions/session-state-ops.ts"
import { applySessionPatches } from "../../../../../shared/lib/features/bmxt-window/terminal-sessions/session-patches.ts"

describe("session-state-ops", () => {
  it("appendLinesToSessionState keeps session id", () => {
    const base = createEmptyTerminalSessionsState()
    const sessionId = base.activeId
    const next = appendLinesToSessionState(base, sessionId, ["> tab -list", "hint"])
    assert.deepEqual(next.order, base.order)
    assert.deepEqual(next.logsById[sessionId], ["> tab -list", "hint"])
  })

  it("exitSessionState on last session marks fullClose", () => {
    const base = createEmptyTerminalSessionsState()
    const result = exitSessionState(base, base.activeId)
    assert.equal(result.fullClose, true)
  })
})

describe("applySessionPatches", () => {
  it("applies appendLog without changing session ids", () => {
    const base = createEmptyTerminalSessionsState()
    const sessionId = base.activeId
    const next = applySessionPatches(base, [
      { type: "appendLog", sessionId, lines: ["> help", "line"] }
    ])
    assert.deepEqual(next.order, base.order)
    assert.deepEqual(next.logsById[sessionId], ["> help", "line"])
  })

  it("encodes appendLog channel so stderr is not dropped", () => {
    const base = createEmptyTerminalSessionsState()
    const sessionId = base.activeId
    const next = applySessionPatches(base, [
      { type: "appendLog", sessionId, lines: ["usage: tab -list"], channel: "stderr" }
    ])
    const stored = next.logsById[sessionId]?.[0] ?? ""
    assert.equal(stored.startsWith(STDERR_LOG_PREFIX), true)
    assert.deepEqual(decodeLogLine(stored), {
      text: "usage: tab -list",
      channel: "stderr"
    })
  })
})
