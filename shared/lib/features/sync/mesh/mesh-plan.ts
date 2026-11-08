import { connectRoleForPeer } from "../bus/connect-role.ts"
import type { SyncDeviceId } from "../types.ts"

export type MeshPeerAnnounce = {
  deviceId: SyncDeviceId
  displayName: string
}

/**
 * EN: Peers we should create a directed mesh offer toward (deterministic offerer only).
 * JA: メッシュ directed offer を出すべき peer（辞書順で offer 側のみ）。
 */
export function peersToOfferMesh(args: {
  selfDeviceId: SyncDeviceId
  announced: readonly MeshPeerAnnounce[]
  alreadyConnectedOrBusy: ReadonlySet<SyncDeviceId>
}): MeshPeerAnnounce[] {
  const out: MeshPeerAnnounce[] = []
  const seen = new Set<SyncDeviceId>()
  for (const peer of args.announced) {
    const id = peer.deviceId.trim()
    if (id.length === 0 || id === args.selfDeviceId) {
      continue
    }
    if (seen.has(id) || args.alreadyConnectedOrBusy.has(id)) {
      continue
    }
    seen.add(id)
    if (connectRoleForPeer(args.selfDeviceId, id) !== "offer") {
      continue
    }
    out.push({
      deviceId: id,
      displayName: peer.displayName.trim().length > 0 ? peer.displayName.trim() : id
    })
  }
  return out
}

/**
 * EN: Other live peers to advertise to a newly connected neighbor (exclude self + neighbor).
 * JA: 新規接続相手へ広告する他の生存 peer（自分と相手は除外）。
 */
export function peersToAnnounce(args: {
  selfDeviceId: SyncDeviceId
  neighborDeviceId: SyncDeviceId
  connectedIds: readonly SyncDeviceId[]
  displayNameOf: (deviceId: SyncDeviceId) => string
}): MeshPeerAnnounce[] {
  const out: MeshPeerAnnounce[] = []
  for (const id of args.connectedIds) {
    if (id === args.selfDeviceId || id === args.neighborDeviceId || id === "pending-offer") {
      continue
    }
    out.push({
      deviceId: id,
      displayName: args.displayNameOf(id)
    })
  }
  return out
}
