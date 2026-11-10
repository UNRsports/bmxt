import type { TabPickerRow } from "./picker-rows.ts"

export type FamilySendDestination = {
  deviceId: string
  /** EN: Peer-local window id when the move target names a window/tab/group. */
  peerWindowId: number | null
}

/**
 * EN: Resolve a visible move destination row as a Family send target (remote only).
 * JA: 可視の移動先行がリモートなら Family 送信先として解決する。
 */
export function resolveFamilySendDestination(
  rows: readonly TabPickerRow[],
  visibleRowIndices: readonly number[],
  moveDestHi: number
): FamilySendDestination | null {
  const rowIndex = visibleRowIndices[moveDestHi]
  if (rowIndex === undefined) {
    return null
  }
  const row = rows[rowIndex]
  if (row === undefined || !row.remote || row.deviceId === null) {
    return null
  }
  if (row.kind === "window") {
    return { deviceId: row.deviceId, peerWindowId: row.peerWindowId }
  }
  if (row.kind === "group") {
    return { deviceId: row.deviceId, peerWindowId: row.peerWindowId }
  }
  if (row.kind === "tab") {
    return { deviceId: row.deviceId, peerWindowId: row.peerWindowId }
  }
  return null
}
