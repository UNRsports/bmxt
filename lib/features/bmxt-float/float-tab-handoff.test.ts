import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendHandoffLogLines,
  isFloatPendingHandoffV1
} from "./float-tab-handoff.ts"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"

function sampleSessions(): TerminalSessionsStateV1 {
  return {
    v: 2,
    order: ["s1"],
    activeId: "s1",
    logsById: { s1: ["> hello"] },
    namesById: { s1: "main" }
  }
}

describe("float-tab-handoff", () => {
  it("appendHandoffLogLines appends onto the requested session", () => {
    const base = sampleSessions()
    const next = appendHandoffLogLines(base, "s1", ["closed #t:1"])
    assert.deepEqual(next.logsById.s1, ["> hello", "closed #t:1"])
  })

  it("isFloatPendingHandoffV1 accepts a valid pending blob", () => {
    assert.equal(
      isFloatPendingHandoffV1({
        v: 1,
        payload: {
          sessions: sampleSessions(),
          browse: createEmptyFloatBrowseState()
        }
      }),
      true
    )
  })

  it("isFloatPendingHandoffV1 rejects malformed pending blobs", () => {
    assert.equal(isFloatPendingHandoffV1(null), false)
    assert.equal(isFloatPendingHandoffV1({ v: 1, payload: {} }), false)
  })
})
