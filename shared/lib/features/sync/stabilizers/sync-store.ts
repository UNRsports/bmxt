import type {
  SyncPrefsDocument,
  SyncRosterDocument,
  SyncSnapshotIndexDocument,
  SyncWorkdirConfig
} from "../types"

/**
 * EN: Stabilizer — authoritative sync payload collect/apply (6a).
 * JA: 正本ペイロードの収集／適用スタビライザー（6a）。
 */
export type SyncStoreStabilizer = {
  getWorkdirConfig(): Promise<SyncWorkdirConfig>
  setWorkdirConfig(config: SyncWorkdirConfig): Promise<void>
  pickWorkdir(): Promise<
    | { ok: true; directoryName: string }
    | { ok: false; cancelled: true }
    | { ok: false; cancelled?: false; error: string }
  >
  hasWorkdir(): Promise<boolean>
  collectPrefs(): Promise<SyncPrefsDocument>
  applyPrefs(doc: SyncPrefsDocument): Promise<{ applied: number; skipped: number }>
  readRemotePrefs(): Promise<SyncPrefsDocument | null>
  writeRemotePrefs(doc: SyncPrefsDocument): Promise<void>
  readRoster(): Promise<SyncRosterDocument | null>
  writeRoster(doc: SyncRosterDocument): Promise<void>
  readSnapshotIndex(): Promise<SyncSnapshotIndexDocument | null>
  writeSnapshotIndex(doc: SyncSnapshotIndexDocument): Promise<void>
  pushAll(): Promise<{ prefs: boolean; roster: boolean; snapshots: boolean }>
  pullAll(): Promise<{ prefs: boolean; roster: boolean; snapshots: boolean }>
}
