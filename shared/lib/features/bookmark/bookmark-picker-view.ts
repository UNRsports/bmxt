/** EN: Pure view / action helpers for the bookmark tree picker. */

import {
  buildBookmarkMoveCommandLine,
  buildBookmarkOpenCommandLine,
  buildBookmarkRemoveCommandLine,
  buildBookmarkSendCommandLine
} from "../picker/build-picker-command-line.ts"
import type { TreePickerRowView } from "../side-picker/tree/tree-picker-types.ts"
import type { BookmarkPickerState } from "./bookmark-picker-state.ts"
import { isBookmarkFolderExpanded } from "./fold-state.ts"
import type { BookmarkPickerRow } from "./picker-rows.ts"

export type BookmarkActionId = "open" | "remove" | "move" | "send"

function isRowMarked(state: BookmarkPickerState, row: BookmarkPickerRow): boolean {
  if (row.kind === "folder") {
    return state.markedFolderIds.includes(row.bookmarkId)
  }
  return state.markedItemIds.includes(row.bookmarkId)
}

/** EN: Map visible rows (indices into `state.rows`) to tab-picker-style row views. */
export function buildBookmarkTreeViews(
  state: BookmarkPickerState,
  visibleIndices: readonly number[]
): TreePickerRowView[] {
  const views: TreePickerRowView[] = []
  for (const rowIndex of visibleIndices) {
    const row = state.rows[rowIndex]
    if (row === undefined) {
      continue
    }
    const marked = isRowMarked(state, row)
    if (row.kind === "folder") {
      views.push({
        domKey: `bf-${row.bookmarkId}`,
        variant: row.depth === 0 ? "window" : "group",
        foldable: true,
        expanded: isBookmarkFolderExpanded(row.bookmarkId),
        marked,
        label: row.label,
        detail: null,
        indent: row.depth === 0 ? 0 : row.depth - 1
      })
      continue
    }
    views.push({
      domKey: `bi-${row.bookmarkId}`,
      variant: "tab",
      foldable: false,
      expanded: false,
      marked,
      label: row.title,
      detail: row.url.length > 0 ? row.url : null,
      indent: row.depth > 0 ? row.depth - 1 : 0
    })
  }
  return views
}

/**
 * EN: Drop removed ids from the row list; removing a folder drops its whole subtree.
 * JA: 削除した id を行リストから除く。フォルダは配下ごと除く。
 */
export function removeBookmarkRowsById(
  rows: readonly BookmarkPickerRow[],
  removedIds: readonly string[]
): BookmarkPickerRow[] {
  const removed = new Set<string>(removedIds)
  const out: BookmarkPickerRow[] = []
  let skipDepth: number | null = null
  for (const row of rows) {
    if (skipDepth !== null) {
      if (row.depth > skipDepth) {
        continue
      }
      skipDepth = null
    }
    if (removed.has(row.bookmarkId)) {
      if (row.kind === "folder") {
        skipDepth = row.depth
      }
      continue
    }
    out.push(row)
  }
  return out
}

/** EN: Actions available for the targeted rows (open needs exactly one item). */
export function bookmarkActionsForTargets(
  targets: readonly BookmarkPickerRow[]
): BookmarkActionId[] {
  const actions: BookmarkActionId[] = []
  if (targets.length === 1 && targets[0]!.kind === "item") {
    actions.push("open")
  }
  if (targets.length > 0) {
    actions.push("remove")
    actions.push("move")
  }
  const itemUrls = targets.filter((row) => row.kind === "item" && row.url.length > 0)
  if (itemUrls.length > 0 && itemUrls.length === targets.length) {
    actions.push("send")
  }
  return actions
}

export type BookmarkSendMode = "open" | "save" | "both"

/** EN: Typed command line for an action, or null when the targets cannot be encoded. */
export function buildBookmarkActionLine(
  action: BookmarkActionId,
  targets: readonly BookmarkPickerRow[],
  opts?: { parentId?: string; deviceId?: string; sendMode?: BookmarkSendMode }
): string | null {
  if (action === "open") {
    const first = targets[0]
    if (targets.length !== 1 || first === undefined || first.kind !== "item") {
      return null
    }
    return buildBookmarkOpenCommandLine(first.url)
  }
  if (action === "move") {
    const parentId = opts?.parentId
    if (parentId === undefined || parentId.length === 0) {
      return null
    }
    const ids: string[] = []
    for (const row of targets) {
      ids.push(row.bookmarkId)
    }
    return buildBookmarkMoveCommandLine(ids, parentId)
  }
  if (action === "send") {
    const deviceId = opts?.deviceId
    if (deviceId === undefined || deviceId.length === 0) {
      return null
    }
    const urls: string[] = []
    for (const row of targets) {
      if (row.kind !== "item") {
        return null
      }
      urls.push(row.url)
    }
    const sendMode = opts?.sendMode ?? "open"
    return buildBookmarkSendCommandLine(deviceId, urls, sendMode)
  }
  const ids: string[] = []
  for (const row of targets) {
    ids.push(row.bookmarkId)
  }
  return buildBookmarkRemoveCommandLine(ids)
}

export function bookmarkTargetLabel(row: BookmarkPickerRow): string {
  if (row.kind === "folder") {
    return row.label
  }
  return row.title
}
