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

/**
 * EN: Build a remote move op from an insert *slot* (gap between tabs), not a destination tab row.
 * JA: 移動先タブ行ではなく挿入スロット（タブ間）からリモート move を組み立てる。
 */
export function buildRemoteMoveOpFromSlot(
  rows: readonly TabPickerRow[],
  peerTabIds: number[],
  slot: {
    windowId: number
    beforeTabId: number | null
    groupId: number | null
    ungroup: boolean
  }
): SyncTabsOp | null {
  if (peerTabIds.length === 0) {
    return null
  }

  let peerWindowId: number | null = null
  let peerBeforeTabId: number | null = null
  let peerGroupId: number | null = null

  if (slot.beforeTabId !== null) {
    const beforeRow = tabRowByPickerTabId(rows, slot.beforeTabId)
    if (
      beforeRow === null ||
      !beforeRow.remote ||
      beforeRow.peerTabId === null ||
      beforeRow.peerWindowId === null
    ) {
      return null
    }
    peerWindowId = beforeRow.peerWindowId
    peerBeforeTabId = beforeRow.peerTabId
    if (slot.groupId !== null && !slot.ungroup) {
      peerGroupId = beforeRow.peerGroupId
    }
  } else {
    const win = windowRowByPickerWindowId(rows, slot.windowId)
    if (win === null || !win.remote || win.peerWindowId === null) {
      return null
    }
    peerWindowId = win.peerWindowId
  }

  if (slot.groupId !== null && !slot.ungroup && peerGroupId === null) {
    for (const row of rows) {
      if (
        row.kind === "group" &&
        row.windowId === slot.windowId &&
        row.groupId === slot.groupId &&
        row.remote &&
        row.peerGroupId !== null
      ) {
        peerGroupId = row.peerGroupId
        if (row.peerWindowId !== null) {
          peerWindowId = row.peerWindowId
        }
        break
      }
    }
  }

  if (peerWindowId === null) {
    return null
  }

  return {
    kind: "move",
    tabIds: peerTabIds,
    windowId: peerWindowId,
    index: -1,
    beforeTabId: peerBeforeTabId,
    groupId: slot.ungroup ? null : peerGroupId,
    ungroup: slot.ungroup,
    groupAfter: !slot.ungroup && peerGroupId !== null
  }
}

/** @deprecated Prefer `buildRemoteMoveOpFromSlot` (insert-slot model). */
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
  if (plan.targetKind === "tab" && plan.targetTabId !== null) {
    return buildRemoteMoveOpFromSlot(rows, peerTabIds, {
      windowId: plan.targetWindowId ?? -1,
      beforeTabId: plan.targetTabId,
      groupId: plan.shouldGroupToTargetAfterMove ? plan.targetGroupId : null,
      ungroup: plan.shouldUngroupAfterMove
    })
  }
  if (plan.targetKind === "window" && plan.targetWindowId !== null) {
    return buildRemoteMoveOpFromSlot(rows, peerTabIds, {
      windowId: plan.targetWindowId,
      beforeTabId: null,
      groupId: null,
      ungroup: false
    })
  }
  if (plan.targetKind === "group" && plan.targetWindowId !== null) {
    return buildRemoteMoveOpFromSlot(rows, peerTabIds, {
      windowId: plan.targetWindowId,
      beforeTabId: null,
      groupId: plan.shouldGroupToTargetAfterMove ? plan.targetGroupId : null,
      ungroup: plan.shouldUngroupAfterMove
    })
  }
  return null
}
