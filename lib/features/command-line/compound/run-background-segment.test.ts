import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { SessionPatch } from "../../bmxt-window/terminal-sessions/session-patches.ts"
import { withoutLogPatches } from "./run-background-segment.ts"

describe("withoutLogPatches", () => {
  it("drops appendLog and setLog but keeps other patches", () => {
    const sid = "s1"
    const patches: SessionPatch[] = [
      { type: "appendLog", sessionId: sid, lines: ["> reload 1", "title"] },
      { type: "setActive", sessionId: sid },
      { type: "setLog", sessionId: sid, lines: ["x"] }
    ]
    const filtered = withoutLogPatches(patches)
    assert.deepEqual(filtered, [{ type: "setActive", sessionId: sid }])
  })
})
