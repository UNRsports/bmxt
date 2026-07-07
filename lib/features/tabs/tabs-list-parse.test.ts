import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseTabsListLine } from "./tabs-list-parse.ts"

describe("parseTabsListLine", () => {
  it("parses plain list default", () => {
    assert.deepEqual(parseTabsListLine("tabs -list"), { showUrl: false })
  })

  it("parses -url", () => {
    assert.deepEqual(parseTabsListLine("tabs -list -url"), { showUrl: true })
  })

  it("rejects --picker and unknown tokens", () => {
    assert.equal(parseTabsListLine("tabs -list --picker"), null)
    assert.equal(parseTabsListLine("tabs -list --foo"), null)
  })
})
