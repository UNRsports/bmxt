import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  domTreeGuideForDepth,
  parseDomTreeSourceLine
} from "../../../../shared/lib/features/dom/dom-list-line-format.ts"

describe("parseDomTreeSourceLine", () => {
  it("parses react-style single-token rows", () => {
    const hit = parseDomTreeSourceLine("    div#main.content")
    assert.deepEqual(hit, { depth: 2, content: "div#main.content" })
  })

  it("parses html open-tag rows that contain spaces", () => {
    const hit = parseDomTreeSourceLine('  <div id="main" class="wrap">')
    assert.deepEqual(hit, { depth: 1, content: '<div id="main" class="wrap">' })
    assert.equal(domTreeGuideForDepth(1), "├ ")
  })
})
