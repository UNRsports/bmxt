import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { loadFamilyMembership } from "../device/family-membership"
import type { SyncRosterDocument, SyncRosterMember } from "../types"
import { SYNC_ROSTER_STORAGE_KEY } from "../workdir/storage-keys"

function isRosterDocument(value: unknown): value is SyncRosterDocument {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return o.version === 1 && typeof o.familyId === "string" && Array.isArray(o.members)
}

/**
 * EN: Family roster in chrome.storage.local (replaces FSA roster.json).
 * JA: Family 名簿を chrome.storage.local に保持（FSA roster.json の代替）。
 */
export async function loadLocalRoster(): Promise<SyncRosterDocument | null> {
  const stored = await chrome.storage.local.get(SYNC_ROSTER_STORAGE_KEY)
  const raw = stored[SYNC_ROSTER_STORAGE_KEY]
  if (!isRosterDocument(raw)) {
    return null
  }
  return raw
}

export async function saveLocalRoster(doc: SyncRosterDocument): Promise<void> {
  await chrome.storage.local.set({ [SYNC_ROSTER_STORAGE_KEY]: doc })
}

export async function upsertLocalRosterMember(member: SyncRosterMember): Promise<SyncRosterDocument> {
  const membership = await loadFamilyMembership()
  const device = await loadOrCreateDeviceIdentity()
  const familyId = membership?.familyId ?? member.familyId
  const prev = await loadLocalRoster()
  const baseMembers = prev && prev.familyId === familyId ? prev.members : []
  const others = baseMembers.filter((m) => m.deviceId !== member.deviceId)
  const self: SyncRosterMember = {
    deviceId: device.deviceId,
    displayName: device.displayName,
    browser: device.browser,
    familyId,
    updatedAt: new Date().toISOString(),
    endpointHint: null
  }
  const withoutSelf = others.filter((m) => m.deviceId !== self.deviceId)
  const merged = [...withoutSelf, member.deviceId === self.deviceId ? self : member, self].filter(
    (m, index, arr) => arr.findIndex((x) => x.deviceId === m.deviceId) === index
  )
  const doc: SyncRosterDocument = {
    version: 1,
    familyId,
    members: merged.sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    updatedAt: new Date().toISOString()
  }
  await saveLocalRoster(doc)
  return doc
}
