import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  decodeLogLine,
  encodeLogLine,
  encodeLogLines,
  mergeOutputLines,
  STDERR_LOG_PREFIX
} from "./command-output.ts"

describe("encodeLogLine / decodeLogLine", () => {
  it("round-trips stdout without a prefix", () => {
    const encoded = encodeLogLine("hello", "stdout")
    assert.equal(encoded, "hello")
    assert.deepEqual(decodeLogLine(encoded), { text: "hello", channel: "stdout" })
  })

  it("round-trips stderr with the in-band prefix", () => {
    const encoded = encodeLogLine("usage: tabs -list", "stderr")
    assert.equal(encoded.startsWith(STDERR_LOG_PREFIX), true)
    assert.deepEqual(decodeLogLine(encoded), {
      text: "usage: tabs -list",
      channel: "stderr"
    })
  })

  it("treats legacy plain lines as stdout", () => {
    assert.deepEqual(decodeLogLine("legacy line"), {
      text: "legacy line",
      channel: "stdout"
    })
  })
})

describe("encodeLogLines", () => {
  it("leaves stdout lines unchanged", () => {
    assert.deepEqual(encodeLogLines(["a", "b"], "stdout"), ["a", "b"])
  })

  it("prefixes each stderr line", () => {
    const encoded = encodeLogLines(["err"], "stderr")
    assert.equal(encoded.length, 1)
    assert.deepEqual(decodeLogLine(encoded[0]!), {
      text: "err",
      channel: "stderr"
    })
  })
})

describe("mergeOutputLines", () => {
  it("concatenates stdout then stderr", () => {
    assert.deepEqual(mergeOutputLines(["out"], ["err"]), ["out", "err"])
  })
})
