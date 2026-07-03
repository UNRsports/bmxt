import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseTabsListLine, parseTabsListPickerLine } from "./tabs-list-parse.ts"

describe("parseTabsListLine", () => {
  it("parses plain list default", () => {
    assert.deepEqual(parseTabsListLine("tabs -list"), { showUrl: false, picker: false })
  })

  it("parses picker flag", () => {
    assert.deepEqual(parseTabsListLine("tabs -list --picker"), {
      showUrl: false,
      picker: true
    })
    assert.deepEqual(parseTabsListPickerLine("tabs -list --picker"), { showUrl: false })
  })

  it("parses -u and --picker together", () => {
    assert.deepEqual(parseTabsListLine("tabs -list -u --picker"), {
      showUrl: true,
      picker: true
    })
  })

  it("rejects unknown tokens", () => {
    assert.equal(parseTabsListLine("tabs -list --foo"), null)
  })

  it("plain list does not open picker", () => {
    assert.equal(parseTabsListPickerLine("tabs -list"), null)
  })
})

describe("parseTabsListLine token order", () => {
  it("accepts -u before --picker", () => {
    assert.deepEqual(parseTabsListLine("tabs -list -u --picker"), {
      showUrl: true,
      picker: true
    })
  })
})
