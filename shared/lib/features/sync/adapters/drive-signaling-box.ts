import type { SignalingBoxStabilizer } from "../stabilizers/signaling-box"
import type { SyncDeviceId, SyncSealedEnvelope } from "../types"

/**
 * EN: Drive signaling-box swap seam — not implemented (OAuth / CSP / AMO out of §6).
 * JA: Drive 差し替え境界。未実装（OAuth / CSP / AMO は §6 スコープ外）。
 */
export function createDriveSignalingBoxStabilizer(): SignalingBoxStabilizer {
  const notImplemented = async (): Promise<never> => {
    throw new Error("Drive signaling box is not implemented (local FSA is the default)")
  }
  return {
    kind: "drive",
    put: (_envelope: SyncSealedEnvelope) => notImplemented(),
    listFor: (_to: SyncDeviceId) => notImplemented(),
    remove: (_envelope: SyncSealedEnvelope) => notImplemented(),
    pruneExpired: () => notImplemented()
  }
}
