import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import type { BookmarkCacheEntry } from "../../../../shared/lib/features/search/cache/types.ts"
import {
  buildBookmarkPickerRowsFromEntriesWith,
  type BookmarkPickerRow
} from "../../../../shared/lib/features/bookmark/picker-rows-build.ts"
import {
  collapseBookmarkFolder,
  computeBookmarkVisibleRowIndices,
  expandBookmarkFolder,
  resetBookmarkFoldState
} from "../../../../shared/lib/features/bookmark/fold-state.ts"
import {
  bookmarkActionTargetRows,
  createBookmarkPickerState,
  toggleBookmarkRowMark
} from "../../../../shared/lib/features/bookmark/bookmark-picker-state.ts"
import {
  bookmarkActionsForTargets,
  buildBookmarkActionLine,
  buildBookmarkTreeViews,
  removeBookmarkRowsById
} from "../../../../shared/lib/features/bookmark/bookmark-picker-view.ts"

function folder(id: string, parentId: string, title: string): BookmarkCacheEntry {
  return { bookmarkId: id, parentId, title, url: "", dateAdded: 1, isFolder: true }
}

function item(id: string, parentId: string, title: string, url: string): BookmarkCacheEntry {
  return { bookmarkId: id, parentId, title, url, dateAdded: 2, isFolder: false }
}

const ENTRIES: BookmarkCacheEntry[] = [
  folder("1", "0", "Bookmarks bar"),
  folder("2", "0", "Other"),
  folder("10", "1", "Dev"),
  item("11", "1", "Home", "https://example.com/"),
  item("12", "10", "Docs", "https://example.com/docs"),
  item("13", "2", "Misc", "https://example.com/misc")
]

function buildRows(
  entries: readonly BookmarkCacheEntry[],
  folderId: string | null = null
): BookmarkPickerRow[] {
  return buildBookmarkPickerRowsFromEntriesWith(entries, {
    folderId,
    formatFolderLabel: (title) => title
  })
}

function rowSummary(rows: readonly BookmarkPickerRow[]): string[] {
  return rows.map((row) => `${row.kind}:${row.bookmarkId}:${row.depth}`)
}

describe("buildBookmarkPickerRowsFromEntriesWith", () => {
  afterEach(() => {
    resetBookmarkFoldState()
  })

  it("nests folders before items in preorder with depth", () => {
    const rows = buildRows(ENTRIES)
    assert.deepEqual(rowSummary(rows), [
      "folder:1:0",
      "folder:10:1",
      "item:12:2",
      "item:11:1",
      "folder:2:0",
      "item:13:1"
    ])
  })

  it("limits output to a folder subtree when folderId is set", () => {
    const rows = buildRows(ENTRIES, "10")
    assert.deepEqual(rowSummary(rows), ["folder:10:0", "item:12:1"])
  })

  it("returns no rows for an unknown or non-folder folderId", () => {
    assert.deepEqual(
      buildRows(ENTRIES, "999"),
      []
    )
    assert.deepEqual(
      buildRows(ENTRIES, "11"),
      []
    )
  })

  it("hides descendants of a collapsed folder and restores them on expand", () => {
    const rows = buildRows(ENTRIES)
    assert.deepEqual(computeBookmarkVisibleRowIndices(rows), [0, 1, 2, 3, 4, 5])

    collapseBookmarkFolder("10")
    assert.deepEqual(computeBookmarkVisibleRowIndices(rows), [0, 1, 3, 4, 5])

    collapseBookmarkFolder("1")
    assert.deepEqual(computeBookmarkVisibleRowIndices(rows), [0, 4, 5])

    expandBookmarkFolder("1")
    assert.deepEqual(computeBookmarkVisibleRowIndices(rows), [0, 1, 3, 4, 5])
  })
})

describe("bookmark picker state and views", () => {
  afterEach(() => {
    resetBookmarkFoldState()
  })

  it("rejects marking a different kind than the current marks", () => {
    const rows = buildRows(ENTRIES)
    const folderRow = rows[0]!
    const itemRow = rows[2]!
    const state = createBookmarkPickerState(rows)

    const markedItem = toggleBookmarkRowMark(state, itemRow)
    assert.equal(markedItem.markedKind, "item")
    assert.deepEqual(markedItem.markedItemIds, ["12"])

    const rejected = toggleBookmarkRowMark(markedItem, folderRow)
    assert.equal(rejected, markedItem)

    const unmarked = toggleBookmarkRowMark(markedItem, itemRow)
    assert.equal(unmarked.markedKind, null)
    assert.deepEqual(unmarked.markedItemIds, [])
  })

  it("builds views only for visible rows with fold glyph state", () => {
    const rows = buildRows(ENTRIES)
    const state = createBookmarkPickerState(rows)
    collapseBookmarkFolder("10")
    const visible = computeBookmarkVisibleRowIndices(rows)
    const views = buildBookmarkTreeViews(state, visible)
    assert.equal(views.length, 5)
    assert.equal(views[0]!.variant, "window")
    assert.equal(views[1]!.variant, "group")
    assert.equal(views[1]!.expanded, false)
    assert.equal(views[2]!.variant, "tab")
    assert.equal(views[2]!.detail, "https://example.com/")
  })

  it("uses marked rows as action targets, otherwise the highlighted row", () => {
    const rows = buildRows(ENTRIES)
    const base = createBookmarkPickerState(rows)
    const highlighted = rows[3]!
    assert.deepEqual(
      bookmarkActionTargetRows(base, highlighted).map((row) => row.bookmarkId),
      ["11"]
    )
    const marked = toggleBookmarkRowMark(toggleBookmarkRowMark(base, rows[2]!), rows[3]!)
    assert.deepEqual(
      bookmarkActionTargetRows(marked, highlighted).map((row) => row.bookmarkId),
      ["12", "11"]
    )
  })

  it("offers open only for a single item and builds typed lines", () => {
    const rows = buildRows(ENTRIES)
    const itemRow = rows[3]!
    const folderRow = rows[0]!
    assert.deepEqual(bookmarkActionsForTargets([itemRow]), ["open", "remove", "move", "send"])
    assert.deepEqual(bookmarkActionsForTargets([folderRow]), ["remove", "move"])
    assert.deepEqual(bookmarkActionsForTargets([rows[2]!, itemRow]), ["remove", "move", "send"])
    assert.deepEqual(bookmarkActionsForTargets([]), [])

    assert.equal(buildBookmarkActionLine("open", [itemRow]), "open https://example.com/")
    assert.equal(buildBookmarkActionLine("open", [folderRow]), null)
    assert.equal(buildBookmarkActionLine("remove", [rows[2]!, itemRow]), "bookmark -remove 12 11")
    assert.equal(
      buildBookmarkActionLine("move", [itemRow], { parentId: "1" }),
      "bookmark -move 11 --parent 1"
    )
    assert.equal(
      buildBookmarkActionLine("send", [itemRow], { deviceId: "peer1" }),
      "bookmark -send peer1 --open https://example.com/"
    )
  })

  it("removes a folder together with its subtree", () => {
    const rows = buildRows(ENTRIES)
    assert.deepEqual(rowSummary(removeBookmarkRowsById(rows, ["10"])), [
      "folder:1:0",
      "item:11:1",
      "folder:2:0",
      "item:13:1"
    ])
    assert.deepEqual(rowSummary(removeBookmarkRowsById(rows, ["11", "13"])), [
      "folder:1:0",
      "folder:10:1",
      "item:12:2",
      "folder:2:0"
    ])
  })
})
