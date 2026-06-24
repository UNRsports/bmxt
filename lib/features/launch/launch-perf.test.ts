import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  markLaunchPhase,
  readLaunchPerfMarks,
  resetLaunchPerf
} from "./launch-perf.ts"

describe("launch perf", () => {
  it("records phases relative to reset origin", () => {
    resetLaunchPerf(0)
    markLaunchPhase("shortcut-received")
    markLaunchPhase("resolve-window-done")
    const marks = readLaunchPerfMarks()
    assert.ok(marks.get("shortcut-received")! >= 0)
    assert.ok(marks.get("resolve-window-done")! >= marks.get("shortcut-received")!)
  })
})
