import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { applyRedirectsToOutcome } from "./apply-redirect.ts"
import {
  isNullRedirectTarget,
  parseRedirects
} from "./parse-redirect.ts"
import { segmentFailure, segmentSuccess } from "../compound/classify-outcome.ts"

/** EN: Expected registry order (kept in sync with `registry.ts` — no i18n import). */
const EXPECTED_COMMAND_ENTRY_IDS = [
  "browse",
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

describe("COMMAND_ENTRIES order", () => {
  it("documents browse then plain-list and UI entries", () => {
    assert.equal(EXPECTED_COMMAND_ENTRY_IDS[0], "browse")
    assert.equal(EXPECTED_COMMAND_ENTRY_IDS[1], "plain-list")
    assert.ok(EXPECTED_COMMAND_ENTRY_IDS.includes("help"))
    assert.ok(EXPECTED_COMMAND_ENTRY_IDS.includes("session"))
    assert.ok(EXPECTED_COMMAND_ENTRY_IDS.includes("snapshot"))
  })
})

describe("parseRedirects", () => {
  it("leaves a bare command unchanged", () => {
    assert.deepEqual(parseRedirects("tabs -list"), {
      ok: true,
      command: "tabs -list",
      redirects: []
    })
  })

  it("parses stdout and stderr null sinks", () => {
    assert.deepEqual(parseRedirects("tabs -list > null 2> /dev/null"), {
      ok: true,
      command: "tabs -list",
      redirects: [
        { channel: "stdout", mode: "write", target: "null" },
        { channel: "stderr", mode: "write", target: "/dev/null" }
      ]
    })
  })

  it("parses append operators", () => {
    assert.deepEqual(parseRedirects("help >> null"), {
      ok: true,
      command: "help",
      redirects: [{ channel: "stdout", mode: "append", target: "null" }]
    })
  })

  it("ignores redirects inside quotes and supports escapes", () => {
    assert.deepEqual(parseRedirects("echo 'a > b'"), {
      ok: true,
      command: "echo 'a > b'",
      redirects: []
    })
    assert.deepEqual(parseRedirects(String.raw`echo \> null`), {
      ok: true,
      command: String.raw`echo \> null`,
      redirects: []
    })
  })

  it("rejects dangling redirect", () => {
    assert.deepEqual(parseRedirects("> null"), {
      ok: false,
      error: "dangling_redirect"
    })
  })

  it("rejects empty target", () => {
    assert.deepEqual(parseRedirects("help >"), {
      ok: false,
      error: "empty_redirect_target"
    })
  })
})

describe("isNullRedirectTarget", () => {
  it("accepts null and /dev/null only", () => {
    assert.equal(isNullRedirectTarget("null"), true)
    assert.equal(isNullRedirectTarget("/dev/null"), true)
    assert.equal(isNullRedirectTarget("out.txt"), false)
  })
})

describe("applyRedirectsToOutcome", () => {
  it("discards stdout for > null", () => {
    const out = applyRedirectsToOutcome(segmentSuccess(["line"]), [
      { channel: "stdout", mode: "write", target: "null" }
    ])
    assert.deepEqual(out.stdout, [])
    assert.equal(out.exitStatus, 0)
  })

  it("discards stderr for 2> null", () => {
    const out = applyRedirectsToOutcome(segmentFailure("runtime", ["error: x"]), [
      { channel: "stderr", mode: "write", target: "null" }
    ])
    assert.deepEqual(out.stderr, [])
    assert.equal(out.exitStatus, 1)
  })
})
