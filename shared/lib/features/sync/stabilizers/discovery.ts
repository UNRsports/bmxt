import type { SyncDeviceId, SyncDiscoveryRecord, SyncInviteV1 } from "../types"

/**
 * EN: Stabilizer — Family member discovery (6b: manual / QR / roster hub).
 * JA: メンバー発見スタビライザー（6b: 手入力 / QR / 名簿ハブ）。
 */
export type DiscoveryStabilizer = {
  parseInvite(raw: string): SyncInviteV1 | null
  formatInvite(invite: SyncInviteV1): string
  /** EN: Compact text block suitable for QR payload (no network). */
  formatInviteQrPayload(invite: SyncInviteV1): string
  rememberManual(record: SyncDiscoveryRecord): Promise<void>
  listKnown(): Promise<SyncDiscoveryRecord[]>
  findByDeviceId(deviceId: SyncDeviceId): Promise<SyncDiscoveryRecord | null>
  clear(): Promise<void>
}
