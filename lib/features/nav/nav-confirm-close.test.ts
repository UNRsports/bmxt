import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseNavConfirmCloseAnswer,
  parseNavConfirmCloseTarget
} from "./nav-confirm-close.ts"

describe("parseNavConfirmCloseTarget", () => {
  it("accepts tab and window", () => {
    assert.equal(parseNavConfirmCloseTarget("tab"), "tab")
    assert.equal(parseNavConfirmCloseTarget("window"), "window")
    assert.equal(parseNavConfirmCloseTarget("other"), null)
  })
})

describe("parseNavConfirmCloseAnswer", () => {
  it("parses y/n answers", () => {
    assert.equal(parseNavConfirmCloseAnswer("y"), "yes")
    assert.equal(parseNavConfirmCloseAnswer("n"), "no")
    assert.equal(parseNavConfirmCloseAnswer("tabs -list"), "invalid")
  })
})
