import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  bookmarkFolderRowCount,
  buildBookmarkDrafts,
  buildBookmarkFolderOptions,
  defaultBookmarkFolderIndex,
  isNewBookmarkFolderSelected,
  MAX_BOOKMARK_TITLE_LENGTH,
  normalizeBookmarkTitle,
  selectedBookmarkFolder,
  validateBookmarkItems,
  validateNewBookmarkFolderName,
  wrapIndex
} from "../../../../shared/lib/features/tabs/tab-picker-bookmark-model.ts"
import { parsePickerCommand } from "../../../../shared/lib/features/tabs/parse-picker-command.ts"
import type {
  ActionMenuTabTarget,
  BookmarkPanel
} from "../../../../shared/lib/features/tabs/tab-picker-overlay-types.ts"

function target(tabId: number, url: string, title = `t${tabId}`): ActionMenuTabTarget {
  return { tabId, title, url, faviconSrc: null, groupColor: null, groupTitle: null }
}

function panel(overrides: Partial<BookmarkPanel>): BookmarkPanel {
  return {
    mode: "multi",
    phase: "folderPick",
    items: [],
    skippedInvalidCount: 0,
    folders: [
      { id: "1", label: "Bookmarks bar" },
      { id: "2", label: "Other bookmarks" }
    ],
    foldersLoaded: true,
    folderPickIndex: 0,
    newFolderName: "",
    duplicateUrls: [],
    errorMessage: null,
    submitting: false,
    ...overrides
  }
}

describe("buildBookmarkDrafts", () => {
  it("keeps non-http tabs in single mode so the URL can be fixed", () => {
    const result = buildBookmarkDrafts([target(1, "chrome://extensions")], "single")
    assert.equal(result.items.length, 1)
    assert.equal(result.skippedInvalidCount, 0)
  })

  it("drops non-http(s) tabs in multi mode and counts them", () => {
    const result = buildBookmarkDrafts(
      [target(1, "https://a.example/"), target(2, "chrome://flags"), target(3, "")],
      "multi"
    )
    assert.deepEqual(
      result.items.map((i) => i.tabId),
      [1]
    )
    assert.equal(result.skippedInvalidCount, 2)
  })
})

describe("validateBookmarkItems", () => {
  it("normalizes URL and title", () => {
    const result = validateBookmarkItems([
      { tabId: 1, title: "  Hello  ", url: " https://a.example " }
    ])
    assert.equal(result.ok, true)
    if (result.ok === true) {
      assert.deepEqual(result.items, [{ tabId: 1, title: "Hello", url: "https://a.example/" }])
    }
  })

  it("rejects javascript: and reports the failing index", () => {
    const result = validateBookmarkItems([
      { tabId: 1, title: "ok", url: "https://a.example/" },
      { tabId: 2, title: "bad", url: "javascript:alert(1)" }
    ])
    assert.equal(result.ok, false)
    if (result.ok === false) {
      assert.equal(result.failure.index, 1)
      assert.equal(result.failure.reason, "invalidUrl")
    }
  })

  it("rejects over-long URLs", () => {
    const result = validateBookmarkItems([
      { tabId: 1, title: "x", url: `https://a.example/${"a".repeat(9000)}` }
    ])
    assert.equal(result.ok, false)
    if (result.ok === false) {
      assert.equal(result.failure.reason, "urlTooLong")
    }
  })
})

describe("normalizeBookmarkTitle", () => {
  it("falls back to URL when empty and caps at 512", () => {
    assert.equal(normalizeBookmarkTitle("   ", "https://a.example/"), "https://a.example/")
    const long = "x".repeat(MAX_BOOKMARK_TITLE_LENGTH + 10)
    assert.equal(normalizeBookmarkTitle(long, "https://a.example/").length, MAX_BOOKMARK_TITLE_LENGTH)
  })
})

describe("validateNewBookmarkFolderName", () => {
  it("trims and rejects empty / too long names", () => {
    assert.equal(validateNewBookmarkFolderName("  Work  "), "Work")
    assert.equal(validateNewBookmarkFolderName("   "), null)
    assert.equal(validateNewBookmarkFolderName("x".repeat(MAX_BOOKMARK_TITLE_LENGTH + 1)), null)
  })
})

describe("buildBookmarkFolderOptions", () => {
  it("hides the root, builds path labels and sorts", () => {
    const options = buildBookmarkFolderOptions(
      [
        { id: "0", title: "", parentId: "" },
        { id: "2", title: "Other bookmarks", parentId: "0" },
        { id: "1", title: "Bookmarks bar", parentId: "0" },
        { id: "10", title: "Work", parentId: "1" },
        { id: "11", title: "", parentId: "10" }
      ],
      (id) => `(id:${id})`
    )
    assert.deepEqual(
      options.map((o) => o.label),
      [
        "Bookmarks bar",
        "Bookmarks bar / Work",
        "Bookmarks bar / Work / (id:11)",
        "Other bookmarks"
      ]
    )
    assert.equal(defaultBookmarkFolderIndex(options), 0)
  })

  it("defaults to index 0 when the Bookmarks bar id is absent", () => {
    assert.equal(defaultBookmarkFolderIndex([{ id: "5", label: "x" }]), 0)
  })
})

describe("folder pick index mapping", () => {
  it("multi: row 0 is new folder, rows 1.. map to folders", () => {
    const p = panel({ mode: "multi", folderPickIndex: 0 })
    assert.equal(bookmarkFolderRowCount(p), 3)
    assert.equal(isNewBookmarkFolderSelected(p), true)
    assert.equal(selectedBookmarkFolder(p), null)
    const second = panel({ mode: "multi", folderPickIndex: 2 })
    assert.equal(selectedBookmarkFolder(second)?.id, "2")
  })

  it("single: index maps directly to folders", () => {
    const p = panel({ mode: "single", folderPickIndex: 1 })
    assert.equal(bookmarkFolderRowCount(p), 2)
    assert.equal(isNewBookmarkFolderSelected(p), false)
    assert.equal(selectedBookmarkFolder(p)?.id, "2")
  })
})

describe("wrapIndex", () => {
  it("wraps in both directions", () => {
    assert.equal(wrapIndex(0, -1, 3), 2)
    assert.equal(wrapIndex(2, 1, 3), 0)
    assert.equal(wrapIndex(0, 1, 0), 0)
  })
})

describe("parsePickerCommand bookmark", () => {
  it("accepts bookmark and bm without arguments", () => {
    assert.deepEqual(parsePickerCommand("bookmark"), { kind: "bookmark" })
    assert.deepEqual(parsePickerCommand("bm"), { kind: "bookmark" })
    assert.equal(parsePickerCommand("bookmark --close").kind, "unknown")
  })
})
