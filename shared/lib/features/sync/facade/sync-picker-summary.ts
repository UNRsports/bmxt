import { loadOrCreateDeviceIdentity } from "../device/device-identity.ts"
import { loadFamilyMembership } from "../device/family-membership.ts"
import { loadSyncWorkdirConfig } from "../workdir/config.ts"
import type { SyncWorkdirConfig } from "../types.ts"

/** EN: Live sync control surface for the setting picker (not UiSettings draft). */
export type SyncPickerSummary = {
  deviceId: string
  displayName: string
  browser: string
  familyId: string | null
  workdir: SyncWorkdirConfig
}

export async function loadSyncPickerSummary(): Promise<SyncPickerSummary> {
  const device = await loadOrCreateDeviceIdentity()
  const family = await loadFamilyMembership()
  const workdir = await loadSyncWorkdirConfig()
  return {
    deviceId: device.deviceId,
    displayName: device.displayName,
    browser: device.browser,
    familyId: family?.familyId ?? null,
    workdir
  }
}
