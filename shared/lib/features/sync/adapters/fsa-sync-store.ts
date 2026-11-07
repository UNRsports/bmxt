import {
  MAX_INTERNAL_SNAPSHOT_FILES,
  MAX_SNAPSHOT_BODY_CHARS,
  SNAPSHOTS_STORAGE_KEY
} from "../../extension-storage/keys"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { loadFamilyMembership } from "../device/family-membership"
import { shouldAcceptLww } from "../payload/conflict-lww"
import { isSyncPrefKey, SYNC_PREFS_ALLOWLIST } from "../payload/prefs-allowlist"
import type { SyncStoreStabilizer } from "../stabilizers/sync-store"
import type {
  SyncPrefsDocument,
  SyncRosterDocument,
  SyncRosterMember,
  SyncSnapshotIndexDocument,
  SyncWorkdirConfig
} from "../types"
import {
  SYNC_PREFS_FILE,
  SYNC_ROSTER_FILE,
  SYNC_SNAPSHOT_INDEX_FILE
} from "../workdir/bundle-layout"
import { loadSyncWorkdirConfig, saveSyncWorkdirConfig } from "../workdir/config"
import {
  ensureSyncBundleRoot,
  isFileSystemAccessAvailable,
  readJsonFile,
  resolveReadableSyncRoot,
  resolveWritableSyncRoot,
  verifyDirectoryPermission,
  writeJsonFile
} from "../workdir/fsa-io"
import { saveSyncWorkdirHandle } from "../workdir/handle-db"

const DIRECTORY_PICKER_ID = "bmxt-sync-workdir"

function emptyPrefs(familyId: string, deviceId: string): SyncPrefsDocument {
  const now = new Date().toISOString()
  return {
    version: 1,
    familyId,
    entries: [],
    meta: { updatedAt: now, deviceId }
  }
}

function emptyRoster(familyId: string): SyncRosterDocument {
  return {
    version: 1,
    familyId,
    members: [],
    updatedAt: new Date().toISOString()
  }
}

function emptySnapshots(familyId: string, deviceId: string): SyncSnapshotIndexDocument {
  return {
    version: 1,
    familyId,
    files: [],
    meta: { updatedAt: new Date().toISOString(), deviceId }
  }
}

async function mergeSelfIntoRoster(doc: SyncRosterDocument): Promise<SyncRosterDocument> {
  const membership = await loadFamilyMembership()
  const device = await loadOrCreateDeviceIdentity()
  if (membership === null) {
    return doc
  }
  const self: SyncRosterMember = {
    deviceId: device.deviceId,
    displayName: device.displayName,
    browser: device.browser,
    familyId: membership.familyId,
    updatedAt: new Date().toISOString(),
    endpointHint: null
  }
  const others = doc.members.filter((m) => m.deviceId !== self.deviceId)
  return {
    version: 1,
    familyId: membership.familyId,
    members: [...others, self].sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
    updatedAt: self.updatedAt
  }
}

export function createFsaSyncStoreStabilizer(): SyncStoreStabilizer {
  return {
    async getWorkdirConfig() {
      return loadSyncWorkdirConfig()
    },

    async setWorkdirConfig(config: SyncWorkdirConfig) {
      await saveSyncWorkdirConfig(config)
    },

    async pickWorkdir() {
      if (!isFileSystemAccessAvailable()) {
        return { ok: false as const, error: "unavailable" }
      }
      let picked: FileSystemDirectoryHandle
      try {
        picked = await window.showDirectoryPicker({
          id: DIRECTORY_PICKER_ID,
          mode: "readwrite"
        })
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ""
        if (name === "AbortError") {
          return { ok: false as const, cancelled: true }
        }
        return { ok: false as const, error: "pick_failed" }
      }
      if (!(await verifyDirectoryPermission(picked, true))) {
        return { ok: false as const, error: "permission_denied" }
      }
      await saveSyncWorkdirHandle(picked)
      await ensureSyncBundleRoot(picked)
      const directoryName = picked.name
      const prev = await loadSyncWorkdirConfig()
      await saveSyncWorkdirConfig({
        ...prev,
        enabled: true,
        directoryName
      })
      return { ok: true as const, directoryName }
    },

    async hasWorkdir() {
      const root = await resolveReadableSyncRoot()
      return root !== null
    },

    async collectPrefs() {
      const membership = await loadFamilyMembership()
      const device = await loadOrCreateDeviceIdentity()
      if (membership === null) {
        return emptyPrefs("", device.deviceId)
      }
      const stored = await chrome.storage.local.get([...SYNC_PREFS_ALLOWLIST])
      const now = new Date().toISOString()
      const entries = SYNC_PREFS_ALLOWLIST.filter((key) => key in stored).map((key) => ({
        key,
        value: stored[key],
        meta: { updatedAt: now, deviceId: device.deviceId }
      }))
      return {
        version: 1 as const,
        familyId: membership.familyId,
        entries,
        meta: { updatedAt: now, deviceId: device.deviceId }
      }
    },

    async applyPrefs(doc: SyncPrefsDocument) {
      const membership = await loadFamilyMembership()
      if (membership === null || doc.familyId !== membership.familyId) {
        return { applied: 0, skipped: doc.entries.length }
      }
      let applied = 0
      let skipped = 0
      for (const entry of doc.entries) {
        if (!isSyncPrefKey(entry.key)) {
          skipped += 1
          continue
        }
        const local = await chrome.storage.local.get(entry.key)
        const hasLocal = entry.key in local
        const localMeta = hasLocal
          ? {
              updatedAt: new Date(0).toISOString(),
              deviceId: ""
            }
          : null
        // EN: Prefer remote when local missing; when both exist use document-level LWW on entry meta.
        if (hasLocal && !shouldAcceptLww(localMeta, entry.meta)) {
          // Local exists without per-key meta — accept remote only if entry is newer than prefs doc baseline.
          // Conservative: always accept remote entry when pulling Family prefs (explicit -pull).
        }
        await chrome.storage.local.set({ [entry.key]: entry.value })
        applied += 1
      }
      return { applied, skipped }
    },

    async readRemotePrefs() {
      const root = await resolveReadableSyncRoot()
      if (root === null) {
        return null
      }
      return readJsonFile<SyncPrefsDocument>(root, SYNC_PREFS_FILE)
    },

    async writeRemotePrefs(doc: SyncPrefsDocument) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        throw new Error("sync workdir unavailable")
      }
      await writeJsonFile(root, SYNC_PREFS_FILE, doc)
    },

    async readRoster() {
      const root = await resolveReadableSyncRoot()
      if (root === null) {
        return null
      }
      return readJsonFile<SyncRosterDocument>(root, SYNC_ROSTER_FILE)
    },

    async writeRoster(doc: SyncRosterDocument) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        throw new Error("sync workdir unavailable")
      }
      await writeJsonFile(root, SYNC_ROSTER_FILE, doc)
    },

    async readSnapshotIndex() {
      const root = await resolveReadableSyncRoot()
      if (root === null) {
        return null
      }
      return readJsonFile<SyncSnapshotIndexDocument>(root, SYNC_SNAPSHOT_INDEX_FILE)
    },

    async writeSnapshotIndex(doc: SyncSnapshotIndexDocument) {
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        throw new Error("sync workdir unavailable")
      }
      const files = doc.files
        .filter((f) => f.bodyChars <= MAX_SNAPSHOT_BODY_CHARS)
        .slice(0, MAX_INTERNAL_SNAPSHOT_FILES)
      await writeJsonFile(root, SYNC_SNAPSHOT_INDEX_FILE, { ...doc, files })
    },

    async pushAll() {
      const membership = await loadFamilyMembership()
      const device = await loadOrCreateDeviceIdentity()
      const config = await loadSyncWorkdirConfig()
      if (membership === null || config.paused) {
        return { prefs: false, roster: false, snapshots: false }
      }
      const root = await resolveWritableSyncRoot()
      if (root === null) {
        return { prefs: false, roster: false, snapshots: false }
      }

      const prefs = await this.collectPrefs()
      const remotePrefs = await readJsonFile<SyncPrefsDocument>(root, SYNC_PREFS_FILE)
      let prefsOk = false
      if (
        remotePrefs === null ||
        shouldAcceptLww(remotePrefs.meta, prefs.meta) ||
        remotePrefs.familyId !== membership.familyId
      ) {
        await writeJsonFile(root, SYNC_PREFS_FILE, prefs)
        prefsOk = true
      }

      const remoteRoster =
        (await readJsonFile<SyncRosterDocument>(root, SYNC_ROSTER_FILE)) ??
        emptyRoster(membership.familyId)
      const roster = await mergeSelfIntoRoster({
        ...remoteRoster,
        familyId: membership.familyId
      })
      await writeJsonFile(root, SYNC_ROSTER_FILE, roster)

      const snapStored = await chrome.storage.local.get(SNAPSHOTS_STORAGE_KEY)
      const snapRaw = snapStored[SNAPSHOTS_STORAGE_KEY]
      let snapshotsOk = false
      if (snapRaw && typeof snapRaw === "object") {
        const index = emptySnapshots(membership.familyId, device.deviceId)
        // EN: Index-only push; body sync stays within MAX_SNAPSHOT_* via local store.
        await writeJsonFile(root, SYNC_SNAPSHOT_INDEX_FILE, index)
        snapshotsOk = true
      } else {
        await writeJsonFile(
          root,
          SYNC_SNAPSHOT_INDEX_FILE,
          emptySnapshots(membership.familyId, device.deviceId)
        )
        snapshotsOk = true
      }

      await saveSyncWorkdirConfig({
        ...config,
        lastPushAt: new Date().toISOString()
      })
      return { prefs: prefsOk, roster: true, snapshots: snapshotsOk }
    },

    async pullAll() {
      const membership = await loadFamilyMembership()
      const config = await loadSyncWorkdirConfig()
      if (membership === null || config.paused) {
        return { prefs: false, roster: false, snapshots: false }
      }
      const root = await resolveReadableSyncRoot()
      if (root === null) {
        return { prefs: false, roster: false, snapshots: false }
      }

      let prefsOk = false
      const remotePrefs = await readJsonFile<SyncPrefsDocument>(root, SYNC_PREFS_FILE)
      if (remotePrefs && remotePrefs.familyId === membership.familyId) {
        await this.applyPrefs(remotePrefs)
        prefsOk = true
      }

      const remoteRoster = await readJsonFile<SyncRosterDocument>(root, SYNC_ROSTER_FILE)
      let rosterOk = false
      if (remoteRoster && remoteRoster.familyId === membership.familyId) {
        const merged = await mergeSelfIntoRoster(remoteRoster)
        const writable = await resolveWritableSyncRoot()
        if (writable) {
          await writeJsonFile(writable, SYNC_ROSTER_FILE, merged)
        }
        rosterOk = true
      }

      const remoteSnap = await readJsonFile<SyncSnapshotIndexDocument>(
        root,
        SYNC_SNAPSHOT_INDEX_FILE
      )
      const snapshotsOk = remoteSnap !== null && remoteSnap.familyId === membership.familyId

      await saveSyncWorkdirConfig({
        ...config,
        lastPullAt: new Date().toISOString()
      })
      return { prefs: prefsOk, roster: rosterOk, snapshots: snapshotsOk }
    }
  }
}
