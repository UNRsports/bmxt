import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  beginSyncLinkConnecting,
  endSyncLinkConnecting,
  getSyncLinkStatus,
  resetSyncLinkStatus,
  setSyncLinkConnectedPeers
} from "../../../../shared/lib/features/sync/link/sync-link-status.ts"

describe("sync-link-status", () => {
  it("locks while connecting and clears when a peer connects", () => {
    resetSyncLinkStatus()
    beginSyncLinkConnecting("firefox@test")
    assert.equal(getSyncLinkStatus().connecting, true)
    assert.equal(getSyncLinkStatus().connectingPeerName, "firefox@test")
    setSyncLinkConnectedPeers([{ deviceId: "dev1", displayName: "firefox@test" }])
    assert.equal(getSyncLinkStatus().connecting, false)
    assert.equal(getSyncLinkStatus().connectedPeers.length, 1)
    assert.equal(getSyncLinkStatus().connectedPeers[0]?.displayName, "firefox@test")
    endSyncLinkConnecting()
    resetSyncLinkStatus()
    assert.equal(getSyncLinkStatus().connectedPeers.length, 0)
  })
})
