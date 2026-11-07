import { createFsaCommandQueueStabilizer } from "../adapters/fsa-command-queue"
import { createFsaSignalingBoxStabilizer } from "../adapters/fsa-signaling-box"
import { createFsaSyncStoreStabilizer } from "../adapters/fsa-sync-store"
import { createInPagePeerHostStabilizer } from "../adapters/in-page-peer-host"
import { createManualDiscoveryStabilizer } from "../adapters/manual-discovery"
import { createWebrtcCommandBusStabilizer } from "../adapters/webrtc-command-bus"
import type { SyncStabilizers } from "../stabilizers"

/**
 * EN: Default local wiring — FSA store/signaling/queue + in-page WebRTC bus.
 *     Drive adapter exists as a swap seam but is not selected here.
 * JA: 既定配線（FSA + in-page WebRTC）。Drive は差し替え面のみ。
 */
export function createDefaultSyncStabilizers(): SyncStabilizers {
  const store = createFsaSyncStoreStabilizer()
  const signaling = createFsaSignalingBoxStabilizer()
  const discovery = createManualDiscoveryStabilizer()
  const peerHost = createInPagePeerHostStabilizer(signaling)
  const commandQueue = createFsaCommandQueueStabilizer(signaling)
  const commandBus = createWebrtcCommandBusStabilizer(peerHost, commandQueue)
  return {
    store,
    signaling,
    discovery,
    peerHost,
    commandBus,
    commandQueue
  }
}
