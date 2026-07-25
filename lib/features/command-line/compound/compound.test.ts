import { before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { ensureBmxtCoreForTests } from "../../bmxt-core/test-ensure-wasm.ts"
import { lineHasAndOperator, parseAndSegments } from "./parse-and-segments.ts"
import { parseCompoundSegments } from "./parse-compound-segments.ts"
import { lineHasPipeOperator, parsePipeSegments } from "./parse-pipe-segments.ts"

before(() => {
  ensureBmxtCoreForTests()
})
import {
  classifyOutcomeFromLines,
  segmentFailure,
  segmentSuccess
} from "./classify-outcome.ts"
import {
  EXIT_FAILURE,
  EXIT_MISUSE,
  EXIT_NOT_FOUND,
  EXIT_SUCCESS,
  compoundShouldStop,
  exitStatusForCode,
  isExitSuccess,
  shouldRunAfterOperator
} from "./exit-status.ts"
import { resolveActiveCommandSegment } from "./active-segment.ts"

describe("parseAndSegments", () => {
  it("splits on && outside quotes", () => {
    assert.deepEqual(parseAndSegments("tab -list && dom -list --html"), {
      ok: true,
      segments: ["tab -list", "dom -list --html"]
    })
  })

  it("ignores && inside single quotes", () => {
    assert.deepEqual(parseAndSegments("echo 'a && b' && clear"), {
      ok: true,
      segments: ["echo 'a && b'", "clear"]
    })
  })

  it("ignores && inside double quotes", () => {
    assert.deepEqual(parseAndSegments('tab -list && "a && b"'), {
      ok: true,
      segments: ["tab -list", '"a && b"']
    })
  })

  it("supports escaped &&", () => {
    assert.deepEqual(parseAndSegments(String.raw`tab -list && dom \&& -list`), {
      ok: true,
      segments: ["tab -list", "dom && -list"]
    })
  })

  it("rejects dangling operator", () => {
    assert.deepEqual(parseAndSegments("tab -list &&"), {
      ok: false,
      error: "dangling_operator"
    })
  })

  it("rejects empty segment between operators", () => {
    assert.deepEqual(parseAndSegments("tab -list &&   && clear"), {
      ok: false,
      error: "empty_segment"
    })
  })
})

describe("lineHasPipeOperator", () => {
  it("is false for a single command", () => {
    assert.equal(lineHasPipeOperator("tab -list"), false)
  })

  it("is true for pipe lines", () => {
    assert.equal(lineHasPipeOperator("tab -list | close"), true)
  })
})

describe("parsePipeSegments", () => {
  it("splits on | outside quotes", () => {
    assert.deepEqual(parsePipeSegments("tab -list | close"), {
      ok: true,
      segments: ["tab -list", "close"]
    })
  })

  it("ignores | inside single quotes", () => {
    assert.deepEqual(parsePipeSegments("echo 'a | b' | clear"), {
      ok: true,
      segments: ["echo 'a | b'", "clear"]
    })
  })

  it("supports escaped |", () => {
    assert.deepEqual(parsePipeSegments(String.raw`tab -list | dom \| -list`), {
      ok: true,
      segments: ["tab -list", "dom | -list"]
    })
  })
})

describe("lineHasAndOperator", () => {
  it("is false for a single command", () => {
    assert.equal(lineHasAndOperator("tab -list"), false)
  })

  it("is true for compound lines", () => {
    assert.equal(lineHasAndOperator("tab -list && clear"), true)
  })

  it("is true for || and ;", () => {
    assert.equal(lineHasAndOperator("tab -list || clear"), true)
    assert.equal(lineHasAndOperator("tab -list ; clear"), true)
  })
})

describe("parseCompoundSegments", () => {
  it("splits on || and records operators", () => {
    assert.deepEqual(parseCompoundSegments("tab -list || clear"), {
      ok: true,
      segments: ["tab -list", "clear"],
      operators: ["||"]
    })
  })

  it("splits on ; and records operators", () => {
    assert.deepEqual(parseCompoundSegments("tab -list ; clear"), {
      ok: true,
      segments: ["tab -list", "clear"],
      operators: [";"]
    })
  })

  it("supports mixed operators left-to-right", () => {
    assert.deepEqual(parseCompoundSegments("a && b || c ; d"), {
      ok: true,
      segments: ["a", "b", "c", "d"],
      operators: ["&&", "||", ";"]
    })
  })

  it("supports escaped || and ;", () => {
    assert.deepEqual(parseCompoundSegments(String.raw`echo \|| x ; clear`), {
      ok: true,
      segments: ["echo || x", "clear"],
      operators: [";"]
    })
  })

  it("does not treat single | as a list operator", () => {
    assert.deepEqual(parseCompoundSegments("tab -list | close"), {
      ok: true,
      segments: ["tab -list | close"],
      operators: []
    })
  })
})

describe("shouldRunAfterOperator", () => {
  it("runs && only after success", () => {
    assert.equal(shouldRunAfterOperator("&&", EXIT_SUCCESS), true)
    assert.equal(shouldRunAfterOperator("&&", EXIT_FAILURE), false)
  })

  it("runs || only after failure", () => {
    assert.equal(shouldRunAfterOperator("||", EXIT_SUCCESS), false)
    assert.equal(shouldRunAfterOperator("||", EXIT_FAILURE), true)
  })

  it("always runs after ;", () => {
    assert.equal(shouldRunAfterOperator(";", EXIT_SUCCESS), true)
    assert.equal(shouldRunAfterOperator(";", EXIT_FAILURE), true)
  })
})

describe("classifyOutcomeFromLines", () => {
  it("detects error lines", () => {
    const out = classifyOutcomeFromLines(["error: usage: tab -moveurl <url>"])
    assert.equal(out.ok, false)
    assert.equal(out.code, "runtime")
  })

  it("detects unknown command lines", () => {
    const out = classifyOutcomeFromLines(['error: unknown command: "foo" was entered.'])
    assert.equal(out.ok, false)
    assert.equal(out.code, "unknown")
  })

  it("treats normal output as success", () => {
    const out = classifyOutcomeFromLines(["https://example.com/"])
    assert.equal(out.ok, true)
  })
})

describe("exitStatusForCode", () => {
  it("maps profile codes to POSIX-inspired statuses", () => {
    assert.equal(exitStatusForCode("ok"), EXIT_SUCCESS)
    assert.equal(exitStatusForCode("runtime"), EXIT_FAILURE)
    assert.equal(exitStatusForCode("interactive"), EXIT_FAILURE)
    assert.equal(exitStatusForCode("cancelled"), EXIT_FAILURE)
    assert.equal(exitStatusForCode("usage"), EXIT_MISUSE)
    assert.equal(exitStatusForCode("parse"), EXIT_MISUSE)
    assert.equal(exitStatusForCode("continuation"), EXIT_MISUSE)
    assert.equal(exitStatusForCode("unknown"), EXIT_NOT_FOUND)
  })
})

describe("segmentSuccess / segmentFailure", () => {
  it("sets exitStatus 0 on success and keeps ok in sync", () => {
    const out = segmentSuccess(["line"])
    assert.equal(out.exitStatus, EXIT_SUCCESS)
    assert.equal(out.ok, true)
    assert.equal(out.ok, isExitSuccess(out.exitStatus))
    assert.deepEqual(out.stdout, ["line"])
    assert.deepEqual(out.stderr, [])
    assert.deepEqual(out.lines, ["line"])
  })

  it("sets usage to exit status 2 on stderr", () => {
    const out = segmentFailure("usage", ["usage: tab -list"])
    assert.equal(out.exitStatus, EXIT_MISUSE)
    assert.equal(out.ok, false)
    assert.equal(compoundShouldStop(out.exitStatus), true)
    assert.deepEqual(out.stdout, [])
    assert.deepEqual(out.stderr, ["usage: tab -list"])
    assert.deepEqual(out.lines, ["usage: tab -list"])
  })

  it("sets unknown to exit status 127", () => {
    const out = segmentFailure("unknown", ["error: unknown command: foo"])
    assert.equal(out.exitStatus, EXIT_NOT_FOUND)
    assert.equal(compoundShouldStop(out.exitStatus), true)
  })

  it("does not stop compound on success", () => {
    assert.equal(compoundShouldStop(EXIT_SUCCESS), false)
  })
})

describe("resolveActiveCommandSegment", () => {
  it("uses the segment after && for completion context", () => {
    const line = "tab -list && dom -list"
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "dom -list")
    assert.equal(active.segmentStart, line.indexOf("dom"))
  })

  it("uses the segment after || for completion context", () => {
    const line = "tab -list || clear"
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "clear")
  })

  it("uses the segment after ; for completion context", () => {
    const line = "tab -list ; clear"
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "clear")
  })

  it("keeps first segment when cursor is before &&", () => {
    const line = "tab -list && dom -list"
    const active = resolveActiveCommandSegment(line, 4)
    assert.equal(active.segmentText, "tab -list")
  })

  it("includes trailing whitespace in segment bounds for second-token completion", () => {
    const line = "tab "
    const active = resolveActiveCommandSegment(line, line.length)
    assert.equal(active.segmentText, "tab")
    assert.equal(active.segmentEnd, line.length)
    assert.equal(active.localCursor, line.length)
  })
})
