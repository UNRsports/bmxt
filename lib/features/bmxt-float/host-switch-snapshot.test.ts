/**
 * EN: Unit tests for host-switch snapshot helpers.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appendLinesToHostSnapshot,
  isHostSwitchSnapshot,
  parseHostSwitchSnapshot
} from "./host-switch-snapshot.ts"
import { createEmptyFloatBrowseState } from "./float-browse-state-storage.ts"

describe("host-switch-snapshot", () => {
  const sessions = {
    v: 2 as const,
    order: ["s1"],
    activeId: "s1",
    logsById: { s1: ["hello"] },
    namesById: {}
  }

  it("accepts a valid snapshot", () => {
    const raw = { sessions, browse: createEmptyFloatBrowseState(), floatTabId: 3 }
    assert.equal(isHostSwitchSnapshot(raw), true)
    const parsed = parseHostSwitchSnapshot(raw)
    assert.ok(parsed)
    assert.equal(parsed.floatTabId, 3)
    assert.deepEqual(parsed.sessions.logsById.s1, ["hello"])
  })

  it("appends lines onto the active session", () => {
    const next = appendLinesToHostSnapshot(
      { sessions, browse: createEmptyFloatBrowseState() },
      "s1",
      ["> switchwindow", "moved"]
    )
    assert.deepEqual(next.sessions.logsById.s1, ["hello", "> switchwindow", "moved"])
  })

  it("rejects invalid sessions", () => {
    assert.equal(
      isHostSwitchSnapshot({ sessions: { v: 1 }, browse: createEmptyFloatBrowseState() }),
      false
    )
  })
})
