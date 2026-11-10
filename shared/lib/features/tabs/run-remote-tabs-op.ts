import { getSyncService } from "../sync/facade/sync-service.ts"
import type { SyncTabsOp } from "../sync/types.ts"

/**
 * EN: Forward a tabs_ops payload to a Family peer via the sync service.
 * JA: tabs_ops ペイロードを sync service 経由で Family ピアへ転送する。
 */
export async function runRemoteTabsOp(
  deviceId: string,
  op: SyncTabsOp
): Promise<{ ok: boolean; detail: string | null }> {
  return getSyncService().tabsOps(deviceId, op)
}
