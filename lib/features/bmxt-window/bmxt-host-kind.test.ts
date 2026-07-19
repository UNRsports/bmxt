import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isBmxtHostKind,
  isBmxtSessionClearHost,
  sessionClearAppliesToHost
} from "./bmxt-host-kind.ts"

describe("bmxt-host-kind", () => {
  it("recognizes host kinds and clear hosts", () => {
    assert.equal(isBmxtHostKind("popup"), true)
    assert.equal(isBmxtHostKind("float"), true)
    assert.equal(isBmxtHostKind("all"), false)
    assert.equal(isBmxtSessionClearHost("all"), true)
    assert.equal(isBmxtSessionClearHost("popup"), true)
    assert.equal(isBmxtSessionClearHost("other"), false)
  })

  it("applies clear only to matching host or all", () => {
    assert.equal(sessionClearAppliesToHost("all", "popup"), true)
    assert.equal(sessionClearAppliesToHost("all", "float"), true)
    assert.equal(sessionClearAppliesToHost("popup", "popup"), true)
    assert.equal(sessionClearAppliesToHost("popup", "float"), false)
    assert.equal(sessionClearAppliesToHost("float", "popup"), false)
    assert.equal(sessionClearAppliesToHost("float", "float"), true)
  })
})
