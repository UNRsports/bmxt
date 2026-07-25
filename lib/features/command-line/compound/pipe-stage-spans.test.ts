import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  resolveActivePipeStage,
  scanPipeStageSpans
} from "./pipe-stage-spans.ts"

describe("scanPipeStageSpans", () => {
  it("returns a single stage when there is no pipe", () => {
    const spans = scanPipeStageSpans("#t:12 #t:34")
    assert.equal(spans.length, 1)
    assert.equal(spans[0]!.text, "#t:12 #t:34")
  })

  it("includes an empty consumer stage after dangling |", () => {
    const spans = scanPipeStageSpans("#t:12 #t:34 |")
    assert.equal(spans.length, 2)
    assert.equal(spans[0]!.text, "#t:12 #t:34")
    assert.equal(spans[1]!.text, "")
  })

  it("includes empty consumer after | with trailing space", () => {
    const line = "#t:1 |"
    const spans = scanPipeStageSpans(line + " ")
    assert.equal(spans.length, 2)
    assert.equal(spans[1]!.text, "")
  })

  it("splits producer and consumer", () => {
    const spans = scanPipeStageSpans("#t:1 #t:2 | reload")
    assert.equal(spans.length, 2)
    assert.equal(spans[0]!.text, "#t:1 #t:2")
    assert.equal(spans[1]!.text, "reload")
  })

  it("does not treat || as a pipe split", () => {
    const spans = scanPipeStageSpans("tab -list || close")
    assert.equal(spans.length, 1)
    assert.equal(spans[0]!.text, "tab -list || close")
  })
})

describe("resolveActivePipeStage", () => {
  it("places cursor on empty RHS after |", () => {
    const line = "#t:12 #t:34 |"
    const stage = resolveActivePipeStage(line, line.length)
    assert.equal(stage.stageIndex, 1)
    assert.equal(stage.stageCount, 2)
    assert.equal(stage.localCursor, 0)
  })

  it("stays on producer when caret is before |", () => {
    const line = "#t:12 | reload"
    const stage = resolveActivePipeStage(line, 2)
    assert.equal(stage.stageIndex, 0)
  })
})
