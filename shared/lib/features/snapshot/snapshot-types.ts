export type SnapshotEntryMeta = {
  id: string
  fileName: string
  title: string
  url: string
  savedAt: string
}

export type SnapshotsIndexJson = {
  version: 1
  entries: SnapshotEntryMeta[]
}

export type SnapshotsInternalStore = {
  version: 1
  entries: SnapshotEntryMeta[]
  files: Record<string, string>
}

export type SnapshotSaveInput = {
  title: string
  url: string
  bodyText: string
}

export type SnapshotSaveResult = {
  ok: true
  fileName: string
  path: string
  title: string
  url: string
}

export type SnapshotMigrationResult =
  | { ok: true; migrated: number }
  | { ok: false; error: string }
