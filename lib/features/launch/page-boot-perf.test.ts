import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  flushPageBootPerf,
  markPageBootPhase,
  readPageBootPerfMarks,
  resetPageBootPerf
} from "./page-boot-perf.ts"

describe("page boot perf", () => {
  it("records phases relative to reset origin", () => {
    resetPageBootPerf(0)
    markPageBootPhase("page-script-start")
    markPageBootPhase("terminal-mounted")
    const marks = readPageBootPerfMarks()
    assert.ok(marks.get("page-script-start")! >= 0)
    assert.ok(marks.get("terminal-mounted")! >= marks.get("page-script-start")!)
  })

  it("records each phase at most once", () => {
    resetPageBootPerf(0)
    markPageBootPhase("terminal-mounted")
    markPageBootPhase("terminal-mounted")
    const marks = readPageBootPerfMarks()
    assert.equal(marks.size, 1)
  })

  it("flush includes promptInteractiveMs when marked", async () => {
    resetPageBootPerf(0)
    markPageBootPhase("page-script-start")
    markPageBootPhase("prompt-interactive")
    const snapshot = await flushPageBootPerf()
    assert.equal(snapshot.promptInteractiveMs, snapshot.phases["prompt-interactive"])
    assert.ok(typeof snapshot.phases["page-script-start"] === "number")
  })
})
