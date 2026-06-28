import { describe, expect, it } from "vitest"
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
    const next = appendLinesToSessionState(base, sessionId, ["> tabs -list", "hint"])
    expect(next.order).toEqual(base.order)
    expect(next.logsById[sessionId]).toEqual(["> tabs -list", "hint"])
  })

  it("exitSessionState on last session marks fullClose", () => {
    const base = createEmptyTerminalSessionsState()
    const result = exitSessionState(base, base.activeId)
    expect(result.fullClose).toBe(true)
  })
})

describe("applySessionPatches", () => {
  it("applies appendLog without changing session ids", () => {
    const base = createEmptyTerminalSessionsState()
    const sessionId = base.activeId
    const next = applySessionPatches(base, [
      { type: "appendLog", sessionId, lines: ["> help", "line"] }
    ])
    expect(next.order).toEqual(base.order)
    expect(next.logsById[sessionId]).toEqual(["> help", "line"])
  })
})
