import type { SyncDeviceId } from "../types.ts"

export type SyncConnectRole = "offer" | "answer"

/**
 * EN: Deterministic Perfect-Negotiation-style role from device ids (ASCII order).
 * JA: deviceId の ASCII 順で offer/answer を一意に決める。
 */
export function connectRoleForPeer(
  localDeviceId: SyncDeviceId,
  remoteDeviceId: SyncDeviceId
): SyncConnectRole {
  if (localDeviceId < remoteDeviceId) {
    return "offer"
  }
  return "answer"
}
