import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { connectRoleForPeer } from "../../../../shared/lib/features/sync/bus/connect-role.ts"

describe("connectRoleForPeer", () => {
  it("assigns offer to the lexicographically smaller deviceId", () => {
    assert.equal(connectRoleForPeer("aaa11111", "bbb22222"), "offer")
    assert.equal(connectRoleForPeer("bbb22222", "aaa11111"), "answer")
  })

  it("is antisymmetric for distinct ids", () => {
    const a = "deviceChrome01"
    const b = "deviceFirefox1"
    const ab = connectRoleForPeer(a, b)
    const ba = connectRoleForPeer(b, a)
    assert.notEqual(ab, ba)
    assert.ok(ab === "offer" || ab === "answer")
  })
})
