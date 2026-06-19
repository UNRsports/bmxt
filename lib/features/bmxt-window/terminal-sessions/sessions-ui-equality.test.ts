import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  mergeSessionsStatePreservingStableRefs,
  sessionsUiSnapshotEqual
} from "./sessions-ui-equality.ts"
import type { TerminalSessionsStateV1 } from "./types.ts"

function baseState(): TerminalSessionsStateV1 {
  return {
    v: 2,
    order: ["a", "b"],
    activeId: "a",
    namesById: { a: "one", b: "two" },
    logsById: {
      a: ["> help"],
      b: ["> tabs -list"]
    }
  }
}

describe("sessions-ui-equality", () => {
  it("detects active session changes", () => {
    const prev = baseState()
    const next = { ...prev, activeId: "b" }
    assert.equal(sessionsUiSnapshotEqual(prev, next), false)
  })

  it("preserves log array refs when only activeId changes", () => {
    const prev = baseState()
    const next = { ...prev, activeId: "b", logsById: { ...prev.logsById } }
    const merged = mergeSessionsStatePreservingStableRefs(prev, next)
    assert.equal(merged.activeId, "b")
    assert.equal(merged.logsById.a, prev.logsById.a)
    assert.equal(merged.logsById.b, prev.logsById.b)
  })
})
