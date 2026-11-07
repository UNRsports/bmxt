import type { SyncDeviceId, SyncSealedEnvelope } from "../types"

/**
 * EN: Stabilizer — short-lived signaling / queue box (FSA default; Drive-swappable).
 * JA: 短命シグナリング／キュー箱スタビライザー（既定 FSA、Drive 差し替え可）。
 */
export type SignalingBoxStabilizer = {
  readonly kind: "fsa" | "drive"
  put(envelope: SyncSealedEnvelope): Promise<void>
  /**
   * EN: List envelopes addressed to `toDeviceId` or broadcast `*`, not yet expired.
   * JA: 宛先が自機または `*` で、未期限切れの封筒を列挙。
   */
  listFor(toDeviceId: SyncDeviceId): Promise<SyncSealedEnvelope[]>
  remove(envelope: SyncSealedEnvelope): Promise<void>
  pruneExpired(): Promise<number>
}
