/** EN: Bookmark tree picker session state (rows + highlight + marks + action menu). */

import type { BookmarkPickerRow } from "./picker-rows.ts"

export type BookmarkMarkedKind = "folder" | "item"

/** EN: `browse` = normal tree; `movePickFolder` = choose destination after Move. */
export type BookmarkPickerPhase = "browse" | "movePickFolder"

export type BookmarkPickerState = {
  rows: BookmarkPickerRow[]
  /** EN: Index into the visible-row list (not into `rows`). */
  hi: number
  markedFolderIds: string[]
  markedItemIds: string[]
  /** EN: Homogeneous mark kind; null when nothing is marked. */
  markedKind: BookmarkMarkedKind | null
  actionMenuOpen: boolean
  /** EN: Highlighted action in the open menu. */
  actionMenuIndex: number
  filterQuery: string
  phase: BookmarkPickerPhase
  /** EN: Ids queued for `bookmark -move … --parent` while choosing a folder. */
  moveIds: string[]
}

export function createBookmarkPickerState(rows: BookmarkPickerRow[]): BookmarkPickerState {
  return {
    rows,
    hi: 0,
    markedFolderIds: [],
    markedItemIds: [],
    markedKind: null,
    actionMenuOpen: false,
    actionMenuIndex: 0,
    filterQuery: "",
    phase: "browse",
    moveIds: []
  }
}

export function clearBookmarkPickerMarks(prev: BookmarkPickerState): BookmarkPickerState {
  return {
    ...prev,
    markedFolderIds: [],
    markedItemIds: [],
    markedKind: null
  }
}

/**
 * EN: Toggle mark on a row. A different kind than the current marks is rejected (returns prev).
 * JA: 行のマークを切り替える。現在のマークと異なる種別は拒否する（prev を返す）。
 */
export function toggleBookmarkRowMark(
  prev: BookmarkPickerState,
  row: BookmarkPickerRow
): BookmarkPickerState {
  const rowKind: BookmarkMarkedKind = row.kind === "folder" ? "folder" : "item"
  if (prev.markedKind !== null && prev.markedKind !== rowKind) {
    return prev
  }
  if (rowKind === "folder") {
    const exists = prev.markedFolderIds.includes(row.bookmarkId)
    const nextIds = exists
      ? prev.markedFolderIds.filter((id) => id !== row.bookmarkId)
      : [...prev.markedFolderIds, row.bookmarkId]
    return {
      ...prev,
      markedFolderIds: nextIds,
      markedKind: nextIds.length === 0 ? null : "folder"
    }
  }
  const exists = prev.markedItemIds.includes(row.bookmarkId)
  const nextIds = exists
    ? prev.markedItemIds.filter((id) => id !== row.bookmarkId)
    : [...prev.markedItemIds, row.bookmarkId]
  return {
    ...prev,
    markedItemIds: nextIds,
    markedKind: nextIds.length === 0 ? null : "item"
  }
}

/** EN: Rows targeted by an action: marked rows when any, otherwise the highlighted row. */
export function bookmarkActionTargetRows(
  state: BookmarkPickerState,
  highlighted: BookmarkPickerRow | null
): BookmarkPickerRow[] {
  if (state.markedKind === "folder") {
    return state.rows.filter(
      (row) => row.kind === "folder" && state.markedFolderIds.includes(row.bookmarkId)
    )
  }
  if (state.markedKind === "item") {
    return state.rows.filter(
      (row) => row.kind === "item" && state.markedItemIds.includes(row.bookmarkId)
    )
  }
  if (highlighted === null) {
    return []
  }
  return [highlighted]
}
