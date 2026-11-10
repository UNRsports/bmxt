import { generateFamilySeed, parseSeedB64 } from "../crypto/family-crypto"
import type { SyncFamilyMembership, SyncInviteV1 } from "../types"
import { SYNC_FAMILY_MEMBERSHIP_KEY } from "../workdir/storage-keys"
import { loadOrCreateDeviceIdentity } from "./device-identity.ts"

function isMembership(value: unknown): value is SyncFamilyMembership {
  if (value === null || typeof value !== "object") {
    return false
  }
  const o = value as Record<string, unknown>
  return (
    typeof o.familyId === "string" &&
    o.familyId.length >= 8 &&
    typeof o.seedB64 === "string" &&
    parseSeedB64(o.seedB64) !== null &&
    typeof o.createdAt === "string" &&
    typeof o.joinedAt === "string"
  )
}

export async function loadFamilyMembership(): Promise<SyncFamilyMembership | null> {
  const stored = await chrome.storage.local.get(SYNC_FAMILY_MEMBERSHIP_KEY)
  const raw = stored[SYNC_FAMILY_MEMBERSHIP_KEY]
  if (!isMembership(raw)) {
    return null
  }
  return raw
}

export async function clearFamilyMembership(): Promise<void> {
  await chrome.storage.local.remove(SYNC_FAMILY_MEMBERSHIP_KEY)
}

export async function createFamilyMembership(): Promise<SyncFamilyMembership> {
  const { familyId, seedB64 } = generateFamilySeed()
  const now = new Date().toISOString()
  const membership: SyncFamilyMembership = {
    familyId,
    seedB64,
    createdAt: now,
    joinedAt: now
  }
  await chrome.storage.local.set({ [SYNC_FAMILY_MEMBERSHIP_KEY]: membership })
  return membership
}

export async function joinFamilyFromInvite(invite: SyncInviteV1): Promise<SyncFamilyMembership | null> {
  if (invite.version !== 1) {
    return null
  }
  if (parseSeedB64(invite.seedB64) === null) {
    return null
  }
  if (typeof invite.familyId !== "string" || invite.familyId.length < 8) {
    return null
  }
  const now = new Date().toISOString()
  const membership: SyncFamilyMembership = {
    familyId: invite.familyId,
    seedB64: invite.seedB64,
    createdAt: invite.familyId ? now : now,
    joinedAt: now
  }
  await chrome.storage.local.set({ [SYNC_FAMILY_MEMBERSHIP_KEY]: membership })
  return membership
}

export async function buildInviteForLocalDevice(): Promise<SyncInviteV1 | null> {
  const membership = await loadFamilyMembership()
  if (membership === null) {
    return null
  }
  const device = await loadOrCreateDeviceIdentity()
  return {
    version: 1,
    familyId: membership.familyId,
    seedB64: membership.seedB64,
    fromDeviceId: device.deviceId,
    fromDisplayName: device.displayName
  }
}
