import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { domCaptureToListResult } from "./dom-list-result.ts"

describe("domCaptureToListResult", () => {
  it("keeps notice-only captures as records for plain output", () => {
    const result = domCaptureToListResult(
      {
        lines: ["dom -list --with (--html)", "page", "https://example.com/", "(empty capture)"],
        jumpPaths: [null, null, null, null],
        headerLineCount: 4
      },
      {
        flavor: "--html",
        pickerMode: "with",
        pattern: "",
        locale: "en"
      }
    )
    assert.equal(result.records.length, 4)
    assert.equal(result.records.every((r) => r.kind === "dom.notice"), true)
    assert.equal(result.records[3]?.display?.label, "(empty capture)")
  })

  it("includes headers and node rows", () => {
    const result = domCaptureToListResult(
      {
        lines: ["header", "node-a", "node-b"],
        jumpPaths: [null, [0], [1]],
        headerLineCount: 1
      },
      {
        flavor: "--html",
        pickerMode: "normal",
        pattern: "",
        locale: "en"
      }
    )
    assert.equal(result.records[0]?.kind, "dom.notice")
    assert.equal(result.records[1]?.kind, "dom.node")
    assert.equal(result.records[2]?.kind, "dom.node")
    assert.equal(result.records[1]?.display?.label, "node-a")
  })
})
