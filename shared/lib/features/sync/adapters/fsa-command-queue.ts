import { isEnvelopeExpired, sealJsonPayload, unsealJsonPayload } from "../crypto/family-crypto"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { loadFamilyMembership } from "../device/family-membership"
import type { CommandQueueStabilizer } from "../stabilizers/command-queue"
import type { SignalingBoxStabilizer } from "../stabilizers/signaling-box"
import type { SyncBusCommand, SyncDeviceId } from "../types"
import { SYNC_COMMAND_TTL_MS } from "../workdir/bundle-layout"

function isBusCommand(value: unknown): value is SyncBusCommand {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return typeof o.type === "string" && typeof o.id === "string"
}

export function createFsaCommandQueueStabilizer(
  signaling: SignalingBoxStabilizer
): CommandQueueStabilizer {
  return {
    async enqueue(toDeviceId: SyncDeviceId, command: SyncBusCommand) {
      const membership = await loadFamilyMembership()
      const device = await loadOrCreateDeviceIdentity()
      if (membership === null) {
        throw new Error("no family membership")
      }
      const envelope = await sealJsonPayload({
        familyId: membership.familyId,
        seedB64: membership.seedB64,
        fromDeviceId: device.deviceId,
        toDeviceId,
        kind: "command",
        payload: command,
        ttlMs: SYNC_COMMAND_TTL_MS
      })
      if (envelope === null) {
        throw new Error("seal failed")
      }
      await signaling.put(envelope)
    },

    async dequeueFor(toDeviceId: SyncDeviceId) {
      const membership = await loadFamilyMembership()
      if (membership === null) {
        return []
      }
      const envelopes = await signaling.listFor(toDeviceId)
      const commands: SyncBusCommand[] = []
      for (const env of envelopes) {
        if (env.kind !== "command") {
          continue
        }
        if (isEnvelopeExpired(env)) {
          await signaling.remove(env)
          continue
        }
        const payload = await unsealJsonPayload<unknown>(env, membership.seedB64)
        if (isBusCommand(payload)) {
          commands.push(payload)
        }
        await signaling.remove(env)
      }
      return commands
    },

    async pruneExpired() {
      return signaling.pruneExpired()
    }
  }
}
