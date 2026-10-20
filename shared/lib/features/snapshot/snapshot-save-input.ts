const SNAPSHOT_SAVE_RE = /^\s*snapshot\s+-save(?:\s+(\d+))?\s*$/i

/** EN: Completed `snapshot -save` line handled in the BMXt UI (FSAAPI + storage). */
export function parseSnapshotSaveLine(trimmed: string): { tabId?: string } | null {
  const m = SNAPSHOT_SAVE_RE.exec(trimmed.trim())
  if (!m) {
    return null
  }
  const tabId = m[1]
  if (tabId !== undefined) {
    return { tabId }
  }
  return {}
}
