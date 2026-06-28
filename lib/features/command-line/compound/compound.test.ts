import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { lineHasAndOperator, parseAndSegments } from "./parse-and-segments.ts"
import { classifyOutcomeFromLines } from "./classify-outcome.ts"
import { resolveActiveCommandSegment } from "./active-segment.ts"

describe("parseAndSegments", () => {
  it("splits on && outside quotes", () => {
    assert.deepEqual(parseAndSegments("tabs -list && dom -list --html"), {
      ok: true,
      segments: ["tabs -list", "dom -list --html"]
    })
  })

  it("ignores && inside single quotes", () => {
    assert.deepEqual(parseAndSegments("echo 'a && b' && clear"), {
      ok: true,
      segments: ["echo 'a && b'", "clear"]
    })
  })

  it("ignores && inside double quotes", () => {
    assert.deepEqual(parseAndSegments('tabs -list && "a && b"'), {
      ok: true,
      segments: ["tabs -list", '"a && b"']
    })
  })

  it("supports escaped &&", () => {
    assert.deepEqual(parseAndSegments(String.raw`tabs -list && dom \&& -list`), {
      ok: true,
      segments: ["tabs -list", "dom && -list"]
    })
  })

  it("rejects dangling operator", () => {
    assert.deepEqual(parseAndSegments("tabs -list &&"), {
      ok: false,
      error: "dangling_operator"
    })
  })

  it("rejects empty segment between operators", () => {
    assert.deepEqual(parseAndSegments("tabs -list &&   && clear"), {
      ok: false,
      error: "empty_segment"
    })
  })
})

describe("lineHasAndOperator", () => {
  it("is false for a single command", () => {
    assert.equal(lineHasAndOperator("tabs -list"), false)
  })

  it("is true for compound lines", () => {
    assert.equal(lineHasAndOperator("tabs -list && clear"), true)
  })
})

describe("classifyOutcomeFromLines", () => {
  it("detects error lines", () => {
    const out = classifyOutcomeFromLines(["error: usage: tabs -moveurl <url>"])
    assert.equal(out.ok, false)
    assert.equal(out.code, "runtime")
  })

  it("detects unknown command lines", () => {
    const out = classifyOutcomeFromLines(["error: unknown command: foo. Type help."])
    assert.equal(out.ok, false)
    assert.equal(out.code, "unknown")
  })

  it("treats normal output as success", () => {
    const out = classifyOutcomeFromLines(["https://example.com/"])
    assert.equal(out.ok, true)
  })
})

describe("resolveActiveCommandSegment", () => {
  it("uses the segment after && for completion context", () => {
    const line = "tabs -list && dom -list"
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "dom -list")
    assert.equal(active.segmentStart, line.indexOf("dom"))
  })

  it("keeps first segment when cursor is before &&", () => {
    const line = "tabs -list && dom -list"
    const active = resolveActiveCommandSegment(line, 4)
    assert.equal(active.segmentText, "tabs -list")
  })

  it("includes trailing whitespace in segment bounds for second-token completion", () => {
    const line = "tabs "
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "tabs")
    assert.equal(active.segmentEnd, line.length)
    assert.equal(active.localCursor, line.length)
  })
})
