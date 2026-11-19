/**
 * EN: Unseal / validate CLI door hello (Family seal — ignore impostor localhost).
 * JA: CLI 玄関 hello の封印解除・検証（偽 localhost は無視）。
 */

import {
  isEnvelopeExpired,
  unsealJsonPayload
} from "../../crypto/family-crypto.ts"
import type { SyncSealedEnvelope } from "../../types.ts"
import { LOCALHOST_DOOR_PORT } from "./door-constants.ts"

export type LocalhostDoorHello = {
  v: number
  kind: string
  familyId: string
  deviceId: string
  displayName: string
  port: number
}

export async function unsealDoorHello(
  envelope: SyncSealedEnvelope,
  seedB64: string,
  expectedFamilyId: string
): Promise<LocalhostDoorHello | null> {
  if (envelope.kind !== "signal") {
    return null
  }
  if (envelope.familyId !== expectedFamilyId) {
    return null
  }
  if (isEnvelopeExpired(envelope)) {
    return null
  }
  const plain = await unsealJsonPayload<LocalhostDoorHello>(envelope, seedB64)
  if (plain === null) {
    return null
  }
  if (plain.v !== 1 || plain.kind !== "localhost-door") {
    return null
  }
  if (plain.familyId !== expectedFamilyId) {
    return null
  }
  if (typeof plain.deviceId !== "string" || plain.deviceId.trim().length < 8) {
    return null
  }
  if (plain.port !== LOCALHOST_DOOR_PORT) {
    return null
  }
  return plain
}
