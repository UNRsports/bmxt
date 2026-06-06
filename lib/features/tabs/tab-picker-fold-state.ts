/** EN: Tab picker fold state (window / group); persisted until BMXt `exit` full close. */
/** JA: タブピッカーの開閉状態。BMXt ウィンドウを閉じても保持し、`exit` 全終了で消去。 */

import { TAB_PICKER_FOLD_STATE_KEY } from "../extension-storage/keys"
import type { TabPickerRow } from "./picker-rows"
import { groupRowKey } from "./tab-picker-keyboard"

type StoredTabPickerFoldStateV1 = {
  v: 1
  collapsedWindowIds: number[]
  collapsedGroupKeys: string[]
}

export type TabPickerFoldMutation = {
  focusRowIdx: number | null
  changed: boolean
}

const collapsedWindowIds = new Set<number>()
const collapsedGroupKeys = new Set<string>()

let hydratePromise: Promise<void> | null = null

function parseStoredTabPickerFoldState(raw: unknown): StoredTabPickerFoldStateV1 | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as StoredTabPickerFoldStateV1
  if (o.v !== 1 || !Array.isArray(o.collapsedWindowIds) || !Array.isArray(o.collapsedGroupKeys)) {
    return null
  }
  const collapsedWindowIdsOut: number[] = []
  for (const id of o.collapsedWindowIds) {
    if (typeof id !== "number" || !Number.isInteger(id)) {
      continue
    }
    collapsedWindowIdsOut.push(id)
  }
  const collapsedGroupKeysOut: string[] = []
  for (const key of o.collapsedGroupKeys) {
    if (typeof key !== "string" || key.length === 0 || key.length > 128) {
      continue
    }
    collapsedGroupKeysOut.push(key)
  }
  return {
    v: 1,
    collapsedWindowIds: collapsedWindowIdsOut,
    collapsedGroupKeys: collapsedGroupKeysOut
  }
}

function applyStoredFoldState(stored: StoredTabPickerFoldStateV1): void {
  collapsedWindowIds.clear()
  collapsedGroupKeys.clear()
  for (const id of stored.collapsedWindowIds) {
    collapsedWindowIds.add(id)
  }
  for (const key of stored.collapsedGroupKeys) {
    collapsedGroupKeys.add(key)
  }
}

/** EN: Load fold state from `chrome.storage.local` (once per page context). */
export function hydrateTabPickerFoldStateFromStorage(): Promise<void> {
  if (hydratePromise !== null) {
    return hydratePromise
  }
  hydratePromise = (async () => {
    try {
      const r = await chrome.storage.local.get(TAB_PICKER_FOLD_STATE_KEY)
      const parsed = parseStoredTabPickerFoldState(r[TAB_PICKER_FOLD_STATE_KEY])
      if (parsed !== null) {
        applyStoredFoldState(parsed)
      }
    } catch {
      /* storage unavailable */
    }
  })()
  return hydratePromise
}

/** EN: Persist in-memory fold state (BMXt window close / SW sleep safe). */
export async function persistTabPickerFoldStateToStorage(): Promise<void> {
  const payload: StoredTabPickerFoldStateV1 = {
    v: 1,
    collapsedWindowIds: [...collapsedWindowIds],
    collapsedGroupKeys: [...collapsedGroupKeys]
  }
  try {
    await chrome.storage.local.set({ [TAB_PICKER_FOLD_STATE_KEY]: payload })
  } catch {
    /* ignore */
  }
}

/** EN: Clear fold state on BMXt `exit` full close (storage + in-memory). */
export async function clearTabPickerFoldStateStorage(): Promise<void> {
  collapsedWindowIds.clear()
  collapsedGroupKeys.clear()
  hydratePromise = null
  try {
    await chrome.storage.local.remove(TAB_PICKER_FOLD_STATE_KEY)
  } catch {
    /* ignore */
  }
}

export function isTabPickerWindowExpanded(windowId: number): boolean {
  return !collapsedWindowIds.has(windowId)
}

export function isTabPickerGroupExpanded(windowId: number, groupId: number | null): boolean {
  return !collapsedGroupKeys.has(groupRowKey(windowId, groupId))
}

function setTabPickerWindowExpanded(windowId: number, expanded: boolean): void {
  if (expanded) {
    collapsedWindowIds.delete(windowId)
  } else {
    collapsedWindowIds.add(windowId)
  }
}

function setTabPickerGroupExpanded(windowId: number, groupId: number | null, expanded: boolean): void {
  const key = groupRowKey(windowId, groupId)
  if (expanded) {
    collapsedGroupKeys.delete(key)
  } else {
    collapsedGroupKeys.add(key)
  }
}

function findWindowRowIndex(rows: TabPickerRow[], windowId: number): number | null {
  const idx = rows.findIndex((r) => r.kind === "window" && r.windowId === windowId)
  return idx >= 0 ? idx : null
}

function findGroupRowIndex(
  rows: TabPickerRow[],
  windowId: number,
  groupId: number | null
): number | null {
  const idx = rows.findIndex(
    (r) => r.kind === "group" && r.windowId === windowId && r.groupId === groupId
  )
  return idx >= 0 ? idx : null
}

/** EN: Indices into `rows` that are visible given current fold state. */
export function computeTabPickerVisibleRowIndices(rows: TabPickerRow[]): number[] {
  const out: number[] = []
  let windowExpanded = true
  let groupExpanded = true

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind === "window") {
      windowExpanded = isTabPickerWindowExpanded(r.windowId)
      groupExpanded = true
      out.push(i)
      continue
    }
    if (r.kind === "group") {
      if (!windowExpanded) {
        continue
      }
      groupExpanded = isTabPickerGroupExpanded(r.windowId, r.groupId)
      out.push(i)
      continue
    }
    if (r.kind === "tab") {
      if (!windowExpanded) {
        continue
      }
      if (r.groupId === null || groupExpanded) {
        out.push(i)
      }
      continue
    }
  }
  return out
}

/** EN: Collapse window or group for `row`; returns focus row and whether state changed. */
export function collapseTabPickerAtRow(rows: TabPickerRow[], row: TabPickerRow): TabPickerFoldMutation {
  if (row.kind === "window") {
    const focusRowIdx = findWindowRowIndex(rows, row.windowId)
    if (!isTabPickerWindowExpanded(row.windowId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerWindowExpanded(row.windowId, false)
    return { focusRowIdx, changed: true }
  }
  if (row.kind === "group") {
    const focusRowIdx = findGroupRowIndex(rows, row.windowId, row.groupId)
    if (!isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, false)
    return { focusRowIdx, changed: true }
  }
  if (row.kind === "tab") {
    if (row.groupId === null) {
      return { focusRowIdx: null, changed: false }
    }
    const focusRowIdx = findGroupRowIndex(rows, row.windowId, row.groupId)
    if (!isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, false)
    return { focusRowIdx, changed: true }
  }
  return { focusRowIdx: null, changed: false }
}

/** EN: Expand parent window / group so `tabId` is visible in the tree; returns whether state changed. */
export function expandTabPickerForTabId(rows: TabPickerRow[], tabId: number): boolean {
  const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tabId)
  if (rowIdx < 0) {
    return false
  }
  const tabRow = rows[rowIdx]
  if (!tabRow || tabRow.kind !== "tab") {
    return false
  }
  let changed = false
  if (!isTabPickerWindowExpanded(tabRow.windowId)) {
    setTabPickerWindowExpanded(tabRow.windowId, true)
    changed = true
  }
  if (
    tabRow.groupId !== null &&
    !isTabPickerGroupExpanded(tabRow.windowId, tabRow.groupId)
  ) {
    setTabPickerGroupExpanded(tabRow.windowId, tabRow.groupId, true)
    changed = true
  }
  return changed
}

/** EN: Expand window or group for `row`; returns focus row and whether state changed. */
export function expandTabPickerAtRow(rows: TabPickerRow[], row: TabPickerRow): TabPickerFoldMutation {
  if (row.kind === "window") {
    const focusRowIdx = findWindowRowIndex(rows, row.windowId)
    if (isTabPickerWindowExpanded(row.windowId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerWindowExpanded(row.windowId, true)
    return { focusRowIdx, changed: true }
  }
  if (row.kind === "group") {
    const focusRowIdx = findGroupRowIndex(rows, row.windowId, row.groupId)
    if (isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, true)
    return { focusRowIdx, changed: true }
  }
  if (row.kind === "tab") {
    if (row.groupId === null) {
      return { focusRowIdx: null, changed: false }
    }
    const focusRowIdx = findGroupRowIndex(rows, row.windowId, row.groupId)
    if (isTabPickerGroupExpanded(row.windowId, row.groupId)) {
      return { focusRowIdx, changed: false }
    }
    setTabPickerGroupExpanded(row.windowId, row.groupId, true)
    return { focusRowIdx, changed: true }
  }
  return { focusRowIdx: null, changed: false }
}

void hydrateTabPickerFoldStateFromStorage()
