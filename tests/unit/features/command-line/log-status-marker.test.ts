import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  encodeLogStatusLine,
  parseLogStatusSegments
} from "../../../../shared/lib/features/command-line/log-status-marker.ts"

describe("log-status-marker", () => {
  it("encodes and parses OK", () => {
    const line = encodeLogStatusLine("tabs", "ok")
    const segs = parseLogStatusSegments(line)
    assert.deepEqual(segs, [
      { kind: "text", text: "tabs " },
      { kind: "status", status: "ok" }
    ])
  })

  it("encodes and parses NG", () => {
    const line = encodeLogStatusLine("WebRTC", "ng")
    const segs = parseLogStatusSegments(line)
    assert.ok(segs.some((s) => s.kind === "status" && s.status === "ng"))
  })
})
