import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isTerminalSessionsStateV1 } from "./float-terminal-session-storage.ts"

describe("float-terminal-session-storage", () => {
  it("accepts a valid v2 sessions blob", () => {
    assert.equal(
      isTerminalSessionsStateV1({
        v: 2,
        order: ["a"],
        activeId: "a",
        logsById: { a: ["> hello"] },
        namesById: { a: "main" }
      }),
      true
    )
  })

  it("rejects malformed blobs", () => {
    assert.equal(isTerminalSessionsStateV1(null), false)
    assert.equal(isTerminalSessionsStateV1({ v: 1, order: ["a"], activeId: "a" }), false)
    assert.equal(
      isTerminalSessionsStateV1({
        v: 2,
        order: ["a"],
        activeId: "missing",
        logsById: { a: [] },
        namesById: {}
      }),
      false
    )
  })
})
