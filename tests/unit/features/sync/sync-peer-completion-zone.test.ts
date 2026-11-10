import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { syncPeerDeviceCompletionZone } from "../../../../shared/lib/features/sync/connect/sync-peer-completion-zone.ts"
import { filterReachableSyncPeers } from "../../../../shared/lib/features/sync/connect/reachable-sync-peer.ts"

describe("syncPeerDeviceCompletionZone", () => {
  it("detects deviceId slot after sync -connect", () => {
    const line = "sync -connect "
    const zone = syncPeerDeviceCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone!.subcommand, "-connect")
    assert.equal(zone!.prefix, "")
  })

  it("detects partial deviceId for sync -ping", () => {
    const line = "sync -ping abc"
    const zone = syncPeerDeviceCompletionZone(line, line.length)
    assert.ok(zone)
    assert.equal(zone!.subcommand, "-ping")
    assert.equal(zone!.prefix, "abc")
  })

  it("ignores other sync subcommands", () => {
    const line = "sync -members "
    assert.equal(syncPeerDeviceCompletionZone(line, line.length), null)
  })

  it("ignores when still on the subcommand token", () => {
    const line = "sync -con"
    assert.equal(syncPeerDeviceCompletionZone(line, line.length), null)
  })
})

describe("filterReachableSyncPeers", () => {
  const peers = [
    { deviceId: "firefoxDesk01", displayName: "firefox@desk", rttMs: 12 },
    { deviceId: "chromeLap99xx", displayName: "chrome@lap", rttMs: 8 }
  ]

  it("filters by displayName prefix", () => {
    const hit = filterReachableSyncPeers(peers, "fire", "prefix")
    assert.equal(hit.length, 1)
    assert.equal(hit[0]!.deviceId, "firefoxDesk01")
  })

  it("filters by deviceId contains when menu is open", () => {
    const hit = filterReachableSyncPeers(peers, "Lap", "contains")
    assert.equal(hit.length, 1)
    assert.equal(hit[0]!.deviceId, "chromeLap99xx")
  })
})
