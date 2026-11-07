import type { CommandBusStabilizer } from "./command-bus"
import type { CommandQueueStabilizer } from "./command-queue"
import type { DiscoveryStabilizer } from "./discovery"
import type { PeerHostStabilizer } from "./peer-host"
import type { SignalingBoxStabilizer } from "./signaling-box"
import type { SyncStoreStabilizer } from "./sync-store"

/**
 * EN: Wired stabilizer bundle — facade depends only on this surface.
 * JA: 束ねたスタビライザー。facade はこの面だけに依存する。
 */
export type SyncStabilizers = {
  store: SyncStoreStabilizer
  signaling: SignalingBoxStabilizer
  discovery: DiscoveryStabilizer
  peerHost: PeerHostStabilizer
  commandBus: CommandBusStabilizer
  commandQueue: CommandQueueStabilizer
}

export type { CommandBusStabilizer } from "./command-bus"
export type { CommandQueueStabilizer } from "./command-queue"
export type { DiscoveryStabilizer } from "./discovery"
export type { PeerHostStabilizer, PeerHostSessionHandlers } from "./peer-host"
export type { SignalingBoxStabilizer } from "./signaling-box"
export type { SyncStoreStabilizer } from "./sync-store"
