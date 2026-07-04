import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { domListPickerDispatchLine, parseDomListLine } from "./dom-list-parse.ts"

describe("parseDomListLine", () => {
  it("parses plain list without picker", () => {
    assert.deepEqual(parseDomListLine("dom -list --with --html"), {
      picker: false,
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })

  it("defaults flavor and keeps --with when --picker is present", () => {
    assert.deepEqual(parseDomListLine("dom -list --with --picker"), {
      picker: true,
      pickerMode: "with",
      flavor: "--html",
      showTag: false,
      pattern: ""
    })
  })
})

describe("domListPickerDispatchLine", () => {
  it("returns null without --picker", () => {
    assert.equal(domListPickerDispatchLine("dom -list --with --html"), null)
  })

  it("strips --picker so runDispatch emits dom_list effect", () => {
    assert.equal(
      domListPickerDispatchLine("dom -list --with --html --picker"),
      "dom -list --with --html"
    )
    assert.equal(
      domListPickerDispatchLine("dom -list --picker --normal --react"),
      "dom -list --normal --react"
    )
  })
})
