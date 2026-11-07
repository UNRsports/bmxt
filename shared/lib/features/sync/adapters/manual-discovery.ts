import {
  formatInvite,
  formatInviteQrPayload,
  parseInvite
} from "../discovery/invite-codec"
import type { DiscoveryStabilizer } from "../stabilizers/discovery"
import type { SyncDeviceId, SyncDiscoveryRecord } from "../types"
import { SYNC_DISCOVERY_CACHE_KEY } from "../workdir/storage-keys"

const MAX_RECORDS = 64

function isRecord(value: unknown): value is SyncDiscoveryRecord {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.deviceId === "string" &&
    typeof o.displayName === "string" &&
    typeof o.familyId === "string" &&
    typeof o.discoveredAt === "string" &&
    (o.source === "manual" || o.source === "qr" || o.source === "roster")
  )
}

async function loadAll(): Promise<SyncDiscoveryRecord[]> {
  const stored = await chrome.storage.local.get(SYNC_DISCOVERY_CACHE_KEY)
  const raw = stored[SYNC_DISCOVERY_CACHE_KEY]
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(isRecord).slice(0, MAX_RECORDS)
}

async function saveAll(records: SyncDiscoveryRecord[]): Promise<void> {
  await chrome.storage.local.set({
    [SYNC_DISCOVERY_CACHE_KEY]: records.slice(0, MAX_RECORDS)
  })
}

export function createManualDiscoveryStabilizer(): DiscoveryStabilizer {
  return {
    parseInvite,
    formatInvite,
    formatInviteQrPayload,

    async rememberManual(record: SyncDiscoveryRecord) {
      const all = await loadAll()
      const next = [record, ...all.filter((r) => r.deviceId !== record.deviceId)]
      await saveAll(next)
    },

    async listKnown() {
      return loadAll()
    },

    async findByDeviceId(deviceId: SyncDeviceId) {
      const all = await loadAll()
      return all.find((r) => r.deviceId === deviceId) ?? null
    },

    async clear() {
      await chrome.storage.local.remove(SYNC_DISCOVERY_CACHE_KEY)
    }
  }
}
