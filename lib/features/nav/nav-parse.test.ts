import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { parseNavEnterLine, parseNavExitLine } from "./nav-parse.ts"

describe("nav-parse", () => {
  it("parseNavEnterLine", () => {
    assert.equal(parseNavEnterLine("nav -enter"), true)
    assert.equal(parseNavEnterLine("  NAV  -enter  "), true)
    assert.equal(parseNavEnterLine("nav"), false)
    assert.equal(parseNavEnterLine("nav -exit"), false)
  })

  it("parseNavExitLine", () => {
    assert.equal(parseNavExitLine("nav -exit"), true)
    assert.equal(parseNavExitLine("  nav  -exit  "), true)
    assert.equal(parseNavExitLine("nav"), false)
    assert.equal(parseNavExitLine("nav -enter"), false)
  })
})
