/**
 * BMXt POSIX Profile — conformance checks for exit status, channels, operators, and pipes.
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { segmentFailure, segmentSuccess } from "../compound/classify-outcome.ts"
import {
  EXIT_FAILURE,
  EXIT_MISUSE,
  EXIT_NOT_FOUND,
  EXIT_SUCCESS,
  compoundShouldStop,
  exitStatusForCode,
  isExitSuccess,
  shouldRunAfterOperator
} from "../compound/exit-status.ts"
import { parseCompoundSegments } from "../compound/parse-compound-segments.ts"
import {
  decodeLogLine,
  encodeLogLine,
  mergeOutputLines
} from "../command-output.ts"
import { applyRedirectsToOutcome } from "../commands/apply-redirect.ts"
import {
  isNullRedirectTarget,
  parseRedirects
} from "../commands/parse-redirect.ts"
import { CLOSE_ACCEPTS_KINDS, isClosePipeConsumer } from "../pipe/consumers/close-match.ts"
import { listResultAcceptsKinds } from "../pipe/consumers/list-result-accepts-kinds.ts"
import { LIST_OUTPUT_SCHEMA, type ListResult } from "../list-output/types.ts"

/** EN: Keep in sync with `commands/registry.ts` (avoid importing UI/i18n modules in tests). */
const EXPECTED_COMMAND_ENTRY_IDS = [
  "picker",
  "plain-list",
  "setting",
  "tabs-setting",
  "dom-setting",
  "session",
  "tabs-list",
  "search-exit",
  "nav-enter",
  "translate",
  "nav-exit",
  "dom-exit",
  "group-new",
  "search-list",
  "help",
  "dom-list",
  "snapshot"
] as const

describe("BMXt POSIX Profile — exit status (P1)", () => {
  it("maps codes to profile statuses", () => {
    assert.equal(exitStatusForCode("ok"), EXIT_SUCCESS)
    assert.equal(exitStatusForCode("runtime"), EXIT_FAILURE)
    assert.equal(exitStatusForCode("usage"), EXIT_MISUSE)
    assert.equal(exitStatusForCode("parse"), EXIT_MISUSE)
    assert.equal(exitStatusForCode("unknown"), EXIT_NOT_FOUND)
  })

  it("keeps ok in sync with exitStatus", () => {
    const ok = segmentSuccess(["out"])
    assert.equal(ok.ok, isExitSuccess(ok.exitStatus))
    const fail = segmentFailure("usage", ["usage: x"])
    assert.equal(fail.ok, isExitSuccess(fail.exitStatus))
    assert.equal(compoundShouldStop(fail.exitStatus), true)
  })
})

describe("BMXt POSIX Profile — stdout/stderr (P3)", () => {
  it("routes success to stdout and failure to stderr", () => {
    const ok = segmentSuccess(["line"])
    assert.deepEqual(ok.stdout, ["line"])
    assert.deepEqual(ok.stderr, [])
    const fail = segmentFailure("runtime", ["error: boom"])
    assert.deepEqual(fail.stdout, [])
    assert.deepEqual(fail.stderr, ["error: boom"])
    assert.deepEqual(mergeOutputLines(ok.stdout, fail.stderr), ["line", "error: boom"])
  })

  it("encodes stderr for session log storage", () => {
    const encoded = encodeLogLine("usage: tabs -list", "stderr")
    assert.deepEqual(decodeLogLine(encoded), {
      text: "usage: tabs -list",
      channel: "stderr"
    })
  })
})

describe("BMXt POSIX Profile — list operators (P5)", () => {
  it("parses && || ; with operator table", () => {
    const parsed = parseCompoundSegments("a && b || c ; d")
    assert.deepEqual(parsed, {
      ok: true,
      segments: ["a", "b", "c", "d"],
      operators: ["&&", "||", ";"]
    })
  })

  it("short-circuits && and ||", () => {
    assert.equal(shouldRunAfterOperator("&&", EXIT_SUCCESS), true)
    assert.equal(shouldRunAfterOperator("&&", EXIT_FAILURE), false)
    assert.equal(shouldRunAfterOperator("||", EXIT_SUCCESS), false)
    assert.equal(shouldRunAfterOperator("||", EXIT_FAILURE), true)
    assert.equal(shouldRunAfterOperator(";", EXIT_FAILURE), true)
  })
})

describe("BMXt POSIX Profile — pipe consumers (P4)", () => {
  it("registers close and checks kind compatibility", () => {
    assert.equal(isClosePipeConsumer("close"), true)
    assert.deepEqual(CLOSE_ACCEPTS_KINDS, ["tabs.tab"] as const)

    const tabsList: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "tabs",
      subcommand: "-list",
      records: [
        { kind: "tabs.window", fields: {} },
        { kind: "tabs.tab", fields: { tabId: 1 } }
      ]
    }
    assert.equal(listResultAcceptsKinds(tabsList, CLOSE_ACCEPTS_KINDS), true)

    const sessions: ListResult = {
      schema: LIST_OUTPUT_SCHEMA,
      command: "session",
      subcommand: "-list",
      records: [{ kind: "session.row", fields: {} }]
    }
    assert.equal(listResultAcceptsKinds(sessions, CLOSE_ACCEPTS_KINDS), false)
  })
})

describe("BMXt POSIX Profile — redirects (P6)", () => {
  it("parses null-sink redirects with quote/escape rules", () => {
    assert.deepEqual(parseRedirects("help > null 2>> /dev/null"), {
      ok: true,
      command: "help",
      redirects: [
        { channel: "stdout", mode: "write", target: "null" },
        { channel: "stderr", mode: "append", target: "/dev/null" }
      ]
    })
    assert.deepEqual(parseRedirects("echo 'x > y'"), {
      ok: true,
      command: "echo 'x > y'",
      redirects: []
    })
  })

  it("discards redirected channels", () => {
    const out = applyRedirectsToOutcome(segmentSuccess(["a"]), [
      { channel: "stdout", mode: "write", target: "null" }
    ])
    assert.deepEqual(out.stdout, [])
    assert.equal(isNullRedirectTarget("null"), true)
    assert.equal(isNullRedirectTarget("file.txt"), false)
  })
})

describe("BMXt POSIX Profile — CommandEntry registry (P7)", () => {
  it("places picker then plain-list ahead of other UI entries", () => {
    assert.equal(EXPECTED_COMMAND_ENTRY_IDS[0], "picker")
    assert.equal(EXPECTED_COMMAND_ENTRY_IDS[1], "plain-list")
    assert.ok(EXPECTED_COMMAND_ENTRY_IDS.includes("help"))
    assert.ok(EXPECTED_COMMAND_ENTRY_IDS.includes("background") === false)
  })
})

