import { getSyncService } from "../sync/facade/sync-service.ts"
import type { SyncTabsOp } from "../sync/types.ts"
import type { TabPickerRow } from "./picker-rows.ts"

export type RemotePickerTargetSet =
  | { kind: "local"; tabIds: number[]; windowIds: number[] }
  | {
      kind: "remote"
      deviceId: string
      tabIds: number[]
      windowIds: number[]
      peerTabIds: number[]
      peerWindowIds: number[]
    }
  | { kind: "mixed" }
  | { kind: "empty" }

function tabRowByPickerTabId(
  rows: readonly TabPickerRow[],
  tabId: number
): Extract<TabPickerRow, { kind: "tab" }> | null {
  for (const row of rows) {
    if (row.kind === "tab" && row.tabId === tabId) {
      return row
    }
  }
  return null
}

function windowRowByPickerWindowId(
  rows: readonly TabPickerRow[],
  windowId: number
): Extract<TabPickerRow, { kind: "window" }> | null {
  for (const row of rows) {
    if (row.kind === "window" && row.windowId === windowId) {
      return row
    }
  }
  return null
}

/**
 * EN: Classify selected picker tab/window ids as local, single remote, or mixed.
 * JA: 選択 id をローカル／単一リモート／混在に分類する。
 */
export function classifyPickerSelection(
  rows: readonly TabPickerRow[],
  selectedTabIds: readonly number[],
  markedWindowIds: readonly number[] = []
): RemotePickerTargetSet {
  const deviceKeys = new Set<string>()
  const peerTabIds: number[] = []
  const localTabIds: number[] = []
  let remoteDeviceId: string | null = null

  for (const tabId of selectedTabIds) {
    const row = tabRowByPickerTabId(rows, tabId)
    if (row === null) {
      continue
    }
    if (row.remote && row.deviceId !== null && row.peerTabId !== null) {
      deviceKeys.add(`remote:${row.deviceId}`)
      remoteDeviceId = row.deviceId
      peerTabIds.push(row.peerTabId)
    } else {
      deviceKeys.add("local")
      localTabIds.push(row.tabId)
    }
  }

  const peerWindowIds: number[] = []
  const localWindowIds: number[] = []
  for (const windowId of markedWindowIds) {
    const row = windowRowByPickerWindowId(rows, windowId)
    if (row === null) {
      continue
    }
    if (row.remote && row.deviceId !== null && row.peerWindowId !== null) {
      deviceKeys.add(`remote:${row.deviceId}`)
      remoteDeviceId = row.deviceId
      peerWindowIds.push(row.peerWindowId)
    } else {
      deviceKeys.add("local")
      localWindowIds.push(row.windowId)
    }
  }

  if (deviceKeys.size === 0) {
    return { kind: "empty" }
  }
  if (deviceKeys.size > 1) {
    return { kind: "mixed" }
  }
  if (remoteDeviceId !== null) {
    return {
      kind: "remote",
      deviceId: remoteDeviceId,
      tabIds: [...selectedTabIds],
      windowIds: [...markedWindowIds],
      peerTabIds,
      peerWindowIds
    }
  }
  return {
    kind: "local",
    tabIds: localTabIds,
    windowIds: localWindowIds
  }
}

export function buildRemoteMoveOp(
  rows: readonly TabPickerRow[],
  peerTabIds: number[],
  plan: {
    targetKind: "tab" | "window" | "group"
    targetTabId: number | null
    targetWindowId: number | null
    targetGroupId: number | null
    shouldUngroupAfterMove: boolean
    shouldGroupToTargetAfterMove: boolean
  }
): SyncTabsOp | null {
  if (peerTabIds.length === 0) {
    return null
  }
  if (plan.targetKind === "tab" && plan.targetTabId !== null) {
    const row = tabRowByPickerTabId(rows, plan.targetTabId)
    if (row === null || !row.remote || row.peerTabId === null || row.peerWindowId === null) {
      return null
    }
    return {
      kind: "move",
      tabIds: peerTabIds,
      windowId: row.peerWindowId,
      index: -1,
      beforeTabId: row.peerTabId,
      groupId: plan.shouldGroupToTargetAfterMove ? row.peerGroupId : null,
      ungroup: plan.shouldUngroupAfterMove,
      groupAfter: plan.shouldGroupToTargetAfterMove && row.peerGroupId !== null
    }
  }
  if (plan.targetKind === "window" && plan.targetWindowId !== null) {
    const row = windowRowByPickerWindowId(rows, plan.targetWindowId)
    if (row === null || !row.remote || row.peerWindowId === null) {
      return null
    }
    return {
      kind: "move",
      tabIds: peerTabIds,
      windowId: row.peerWindowId,
      index: -1,
      beforeTabId: null,
      groupId: null,
      ungroup: false,
      groupAfter: false
    }
  }
  if (plan.targetKind === "group" && plan.targetWindowId !== null) {
    let peerWindowId: number | null = null
    let peerGroupId: number | null = null
    for (const row of rows) {
      if (
        row.kind === "group" &&
        row.windowId === plan.targetWindowId &&
        row.groupId === plan.targetGroupId &&
        row.remote
      ) {
        peerWindowId = row.peerWindowId
        peerGroupId = row.peerGroupId
        break
      }
    }
    if (peerWindowId === null) {
      const win = windowRowByPickerWindowId(rows, plan.targetWindowId)
      peerWindowId = win?.peerWindowId ?? null
    }
    if (peerWindowId === null) {
      return null
    }
    return {
      kind: "move",
      tabIds: peerTabIds,
      windowId: peerWindowId,
      index: -1,
      beforeTabId: null,
      groupId: plan.shouldGroupToTargetAfterMove ? peerGroupId : null,
      ungroup: plan.shouldUngroupAfterMove,
      groupAfter: plan.shouldGroupToTargetAfterMove && peerGroupId !== null
    }
  }
  return null
}

export async function runRemoteTabsOp(
  deviceId: string,
  op: SyncTabsOp
): Promise<{ ok: boolean; detail: string | null }> {
  return getSyncService().tabsOps(deviceId, op)
}
