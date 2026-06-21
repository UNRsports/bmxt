/** EN: Tab picker fold state per session; persisted until BMXt `exit` full close. */
/** JA: タブピッカーの開閉状態（セッション単位）。BMXt 全終了で消去。 */

import { TAB_PICKER_FOLD_STATE_KEY } from "../extension-storage/keys"
import type { TabPickerRow } from "./picker-rows"
import {
  computeTabPickerSearchFilteredRowIndices,
  tabPickerTabRowMatchesSearch
} from "./tab-picker-search-visibility"
import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle"
import { groupRowKey } from "./tab-picker-keyboard"

type FoldSnapshot = {
  collapsedWindowIds: number[]
  collapsedGroupKeys: string[]
}

type StoredTabPickerFoldStateV2 = {
  v: 2
  bySession: Record<string, FoldSnapshot>
}

/** @deprecated v1 — migrated to v2 on read. */
type StoredTabPickerFoldStateV1 = {
  v: 1
  collapsedWindowIds: number[]
  collapsedGroupKeys: string[]
}

export type TabPickerFoldMutation = {
  focusRowIdx: number | null
  changed: boolean
}

const foldBySession = new Map<string, FoldSnapshot>()
let activeSessionId: string | null = null
const collapsedWindowIds = new Set<number>()
const collapsedGroupKeys = new Set<string>()

let hydratePromise: Promise<void> | null = null

function parseFoldSnapshot(raw: unknown): FoldSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as FoldSnapshot
  if (!Array.isArray(o.collapsedWindowIds) || !Array.isArray(o.collapsedGroupKeys)) {
    return null
  }
  const collapsedWindowIdsOut: number[] = []
  for (const id of o.collapsedWindowIds) {
    if (typeof id === "number" && Number.isInteger(id)) {
      collapsedWindowIdsOut.push(id)
    }
  }
  const collapsedGroupKeysOut: string[] = []
  for (const key of o.collapsedGroupKeys) {
    if (typeof key === "string" && key.length > 0 && key.length <= 128) {
      collapsedGroupKeysOut.push(key)
    }
  }
  return {
    collapsedWindowIds: collapsedWindowIdsOut,
    collapsedGroupKeys: collapsedGroupKeysOut
  }
}

function parseStoredTabPickerFoldState(raw: unknown): StoredTabPickerFoldStateV2 | null {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const o = raw as Record<string, unknown>
  if (o.v === 1 && Array.isArray(o.collapsedWindowIds) && Array.isArray(o.collapsedGroupKeys)) {
    const v1 = o as StoredTabPickerFoldStateV1
    return {
      v: 2,
      bySession: {
        __legacy__: {
          collapsedWindowIds: v1.collapsedWindowIds.filter(
            (id) => typeof id === "number" && Number.isInteger(id)
          ),
          collapsedGroupKeys: v1.collapsedGroupKeys.filter(
            (key) => typeof key === "string" && key.length > 0 && key.length <= 128
          )
        }
      }
    }
  }
  if (o.v !== 2 || typeof o.bySession !== "object" || o.bySession === null) {
    return null
  }
  const bySession: Record<string, FoldSnapshot> = {}
  for (const [sessionId, snapRaw] of Object.entries(o.bySession as Record<string, unknown>)) {
    if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 128) {
      continue
    }
    const snap = parseFoldSnapshot(snapRaw)
    if (snap !== null) {
      bySession[sessionId] = snap
    }
  }
  return { v: 2, bySession }
}

function snapshotActiveSets(): FoldSnapshot {
  return {
    collapsedWindowIds: [...collapsedWindowIds],
    collapsedGroupKeys: [...collapsedGroupKeys]
  }
}

function applySnapshotToActiveSets(snapshot: FoldSnapshot): void {
  collapsedWindowIds.clear()
  collapsedGroupKeys.clear()
  for (const id of snapshot.collapsedWindowIds) {
    collapsedWindowIds.add(id)
  }
  for (const key of snapshot.collapsedGroupKeys) {
    collapsedGroupKeys.add(key)
  }
}

function persistActiveSessionSnapshot(): void {
  if (activeSessionId === null) {
    return
  }
  foldBySession.set(activeSessionId, snapshotActiveSets())
}

/** EN: Switch in-memory fold view to `sessionId` (call when active session changes). */
export function setTabPickerFoldActiveSession(sessionId: string): void {
  if (activeSessionId === sessionId) {
    return
  }
  persistActiveSessionSnapshot()
  activeSessionId = sessionId
  const snap = foldBySession.get(sessionId)
  if (snap) {
    applySnapshotToActiveSets(snap)
  } else {
    collapsedWindowIds.clear()
    collapsedGroupKeys.clear()
  }
}

/** EN: In-memory fold snapshot for the active session (no storage I/O). */
export async function persistTabPickerFoldStateToStorage(): Promise<void> {
  persistActiveSessionSnapshot()
}

/** EN: Fold state is in-memory only; legacy storage is not read at runtime. */
export function hydrateTabPickerFoldStateFromStorage(): Promise<void> {
  if (hydratePromise !== null) {
    return hydratePromise
  }
  hydratePromise = Promise.resolve()
  return hydratePromise
}

/** EN: Remove fold state for sessions no longer in the process. */
export function pruneTabPickerFoldSessions(validSessionIds: readonly string[]): void {
  const keep = new Set(validSessionIds)
  for (const sessionId of [...foldBySession.keys()]) {
    if (!keep.has(sessionId)) {
      foldBySession.delete(sessionId)
    }
  }
  if (activeSessionId !== null && !keep.has(activeSessionId)) {
    collapsedWindowIds.clear()
    collapsedGroupKeys.clear()
  }
}

/** EN: Remove fold state for a closed session. */
export function removeTabPickerFoldStateForSession(sessionId: string): void {
  foldBySession.delete(sessionId)
  if (activeSessionId === sessionId) {
    collapsedWindowIds.clear()
    collapsedGroupKeys.clear()
  }
}

/** EN: Clear in-memory fold state only (no storage I/O). */
export function clearTabPickerFoldStateInMemory(): void {
  foldBySession.clear()
  collapsedWindowIds.clear()
  collapsedGroupKeys.clear()
  activeSessionId = null
  hydratePromise = null
}

/** EN: Clear fold state on BMXt `exit` full close (storage + in-memory). */
export async function clearTabPickerFoldStateStorage(): Promise<void> {
  clearTabPickerFoldStateInMemory()
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

let searchSessionSnapshot: FoldSnapshot | null = null

function restoreTabPickerFoldSnapshot(snapshot: FoldSnapshot): void {
  applySnapshotToActiveSets(snapshot)
}

/** EN: Capture fold state when `/` search begins (restored on Esc cancel). */
export function beginTabPickerSearchFoldSession(): void {
  searchSessionSnapshot = snapshotActiveSets()
}

/** EN: Restore pre-search fold state after Esc cancel; returns whether a session existed. */
export function cancelTabPickerSearchFoldSession(): boolean {
  if (searchSessionSnapshot === null) {
    return false
  }
  restoreTabPickerFoldSnapshot(searchSessionSnapshot)
  searchSessionSnapshot = null
  return true
}

/** EN: Drop search snapshot without restoring (already committed or redundant). */
export function clearTabPickerSearchFoldSession(): void {
  searchSessionSnapshot = null
}

/** EN: During `/` input — virtually expand matching trees and hide non-matching tabs. */
export function computeTabPickerSearchVisibleRowIndices(
  rows: TabPickerRow[],
  filterQuery: string
): number[] {
  return computeTabPickerSearchFilteredRowIndices(
    rows,
    filterQuery,
    computeTabPickerVisibleRowIndices(rows)
  )
}

/** EN: After Enter commit — persist expansions for trees that contained matches. */
export function applyTabPickerSearchCommitFoldExpansions(
  rows: TabPickerRow[],
  filterQuery: string
): boolean {
  const { byUrl, needle } = parsePickerSearchNeedle(filterQuery)
  if (needle === "") {
    return false
  }
  const lc = needle.toLowerCase()
  let changed = false

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.kind === "tab" && tabPickerTabRowMatchesSearch(r, byUrl, lc)) {
      if (expandTabPickerForTabId(rows, r.tabId)) {
        changed = true
      }
    } else if (!byUrl && r.kind === "window" && r.label.toLowerCase().includes(lc)) {
      if (!isTabPickerWindowExpanded(r.windowId)) {
        setTabPickerWindowExpanded(r.windowId, true)
        changed = true
      }
    } else if (!byUrl && r.kind === "group" && r.label.toLowerCase().includes(lc)) {
      if (!isTabPickerWindowExpanded(r.windowId)) {
        setTabPickerWindowExpanded(r.windowId, true)
        changed = true
      }
      if (!isTabPickerGroupExpanded(r.windowId, r.groupId)) {
        setTabPickerGroupExpanded(r.windowId, r.groupId, true)
        changed = true
      }
    }
  }
  return changed
}

/** EN: Commit search — apply match expansions and end the fold session. */
export function commitTabPickerSearchFoldSession(
  rows: TabPickerRow[],
  filterQuery: string
): boolean {
  const changed = applyTabPickerSearchCommitFoldExpansions(rows, filterQuery)
  searchSessionSnapshot = null
  return changed
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
