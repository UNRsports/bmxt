import { loadOrCreateDeviceIdentity } from "../device/device-identity.ts"
import { loadFamilyMembership } from "../device/family-membership.ts"

/** EN: Live sync control surface for the setting picker (not UiSettings draft). */
export type SyncPickerSummary = {
  deviceId: string
  displayName: string
  browser: string
  familyId: string | null
  connectionCount: number
}

export async function loadSyncPickerSummary(): Promise<SyncPickerSummary> {
  const device = await loadOrCreateDeviceIdentity()
  const family = await loadFamilyMembership()
  const { getSyncService } = await import("./sync-service.ts")
  const status = await getSyncService().status()
  return {
    deviceId: device.deviceId,
    displayName: device.displayName,
    browser: device.browser,
    familyId: family?.familyId ?? null,
    connectionCount: status.connections.filter((c) => c.state === "connected").length
  }
}
