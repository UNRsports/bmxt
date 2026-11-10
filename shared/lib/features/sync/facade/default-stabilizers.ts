import { createInPagePeerHostStabilizer } from "../adapters/in-page-peer-host"
import { createManualDiscoveryStabilizer } from "../adapters/manual-discovery"
import { createMemoryCommandQueueStabilizer } from "../adapters/memory-command-queue"
import { createWebrtcCommandBusStabilizer } from "../adapters/webrtc-command-bus"
import type { SyncStabilizers } from "../stabilizers"

/**
 * EN: Default wiring — prompt-window WebRTC DataChannel + copy-paste handshake (no FSA).
 * JA: 既定配線（プロンプト窓 WebRTC DataChannel + コピペ握手。FSA なし）。
 */
export function createDefaultSyncStabilizers(): SyncStabilizers {
  const discovery = createManualDiscoveryStabilizer()
  const peerHost = createInPagePeerHostStabilizer()
  const commandQueue = createMemoryCommandQueueStabilizer()
  const commandBus = createWebrtcCommandBusStabilizer(peerHost, commandQueue)
  return {
    discovery,
    peerHost,
    commandBus,
    commandQueue
  }
}
