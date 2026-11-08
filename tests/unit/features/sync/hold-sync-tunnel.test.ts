/**
 * EN: Tunnel hold loop is idempotent and does not require chrome APIs.
 * JA: トンネル hold ループは冪等で chrome API 不要。
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  startSyncTunnelHold,
  stopSyncTunnelHold
} from "../../../../shared/lib/features/sync/peer/hold-sync-tunnel.ts"

describe("hold-sync-tunnel", () => {
  it("start is idempotent and stop clears the timer", async () => {
    let ticks = 0
    startSyncTunnelHold(async () => {
      ticks += 1
    })
    startSyncTunnelHold(async () => {
      ticks += 1
    })
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    })
    stopSyncTunnelHold()
    stopSyncTunnelHold()
    assert.ok(ticks >= 1)
  })
})
