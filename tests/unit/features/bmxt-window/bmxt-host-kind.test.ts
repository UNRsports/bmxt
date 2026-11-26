import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isBmxtHostKind,
  isBmxtSessionClearHost,
  sessionClearAppliesToHost
} from "../../../../shared/lib/features/bmxt-window/bmxt-host-kind.ts"

describe("bmxt-host-kind", () => {
  it("recognizes only popup as a valid host kind", () => {
    assert.equal(isBmxtHostKind("popup"), true)
    assert.equal(isBmxtHostKind("float"), false)
    assert.equal(isBmxtHostKind("all"), false)
    assert.equal(isBmxtHostKind("other"), false)
    assert.equal(isBmxtHostKind(undefined), false)
  })

  it("recognizes valid clear host values", () => {
    assert.equal(isBmxtSessionClearHost("all"), true)
    assert.equal(isBmxtSessionClearHost("popup"), true)
    assert.equal(isBmxtSessionClearHost("float"), false)
    assert.equal(isBmxtSessionClearHost("other"), false)
  })

  it("applies clear only to matching host or all", () => {
    assert.equal(sessionClearAppliesToHost("all", "popup"), true)
    assert.equal(sessionClearAppliesToHost("popup", "popup"), true)
  })
})
