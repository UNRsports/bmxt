/**
 * EN: Unit tests for automatic mesh planning helpers.
 * JA: 自動メッシュ計画ヘルパのユニットテスト。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  peersToAnnounce,
  peersToOfferMesh
} from "../../../../shared/lib/features/sync/mesh/mesh-plan.ts"

describe("peersToOfferMesh", () => {
  it("only the lexicographically smaller device offers", () => {
    const targets = peersToOfferMesh({
      selfDeviceId: "aaa",
      announced: [
        { deviceId: "bbb", displayName: "B" },
        { deviceId: "000", displayName: "Z" }
      ],
      alreadyConnectedOrBusy: new Set()
    })
    assert.deepEqual(
      targets.map((t) => t.deviceId),
      ["bbb"]
    )
  })

  it("skips already connected or busy peers", () => {
    const targets = peersToOfferMesh({
      selfDeviceId: "aaa",
      announced: [{ deviceId: "bbb", displayName: "B" }],
      alreadyConnectedOrBusy: new Set(["bbb"])
    })
    assert.equal(targets.length, 0)
  })
})

describe("peersToAnnounce", () => {
  it("excludes self and the neighbor", () => {
    const peers = peersToAnnounce({
      selfDeviceId: "self",
      neighborDeviceId: "n1",
      connectedIds: ["self", "n1", "n2", "pending-offer"],
      displayNameOf: (id) => `name:${id}`
    })
    assert.deepEqual(peers, [{ deviceId: "n2", displayName: "name:n2" }])
  })
})
