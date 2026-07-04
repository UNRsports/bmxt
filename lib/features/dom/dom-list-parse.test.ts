import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseDomListLine } from "./dom-list-parse.ts"

describe("parseDomListLine", () => {
  it("parses plain list", () => {
    assert.deepEqual(parseDomListLine("dom -list --with --html"), {
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("defaults flavor and keeps --with", () => {
    assert.deepEqual(parseDomListLine("dom -list --with"), {
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("rejects unknown option tokens such as --picker", () => {
    assert.equal(parseDomListLine("dom -list --picker"), null)
  })
})
