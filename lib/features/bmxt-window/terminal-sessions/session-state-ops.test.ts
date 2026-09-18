import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendLinesToSessionState,
  createEmptyTerminalSessionsState,
  exitSessionState
} from "./session-state-ops.ts"
import { applySessionPatches } from "./session-patches.ts"

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
})
