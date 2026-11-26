/** EN: Bookmark picker rows ↔ ListResult (bmxt-list/1). */

import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { BookmarkPickerRow } from "./picker-rows.ts"

export function bookmarkPickerRowsToListResult(rows: readonly BookmarkPickerRow[]): ListResult {
  const records: ListRecord[] = []
  for (const row of rows) {
    if (row.kind === "folder") {
      records.push({
        kind: "bookmark.folder",
        fields: {
          bookmarkId: row.bookmarkId,
          parentId: row.parentId,
          title: row.title,
          depth: row.depth
        },
        display: {
          indent: row.depth,
          label: row.label,
          detail: row.bookmarkId
        }
      })
      continue
    }
    records.push({
      kind: "bookmark.item",
      fields: {
        bookmarkId: row.bookmarkId,
        parentId: row.parentId,
        title: row.title,
        url: row.url,
        pageTitle: row.title,
        dateAdded: row.dateAdded,
        depth: row.depth
      },
      display: {
        indent: row.depth,
        label: row.title,
        detail: row.url
      },
      pipeLine: [
        "bookmark.item",
        `bookmarkId=${row.bookmarkId}`,
        `parentId=${row.parentId}`,
        `title=${JSON.stringify(row.title)}`,
        `url=${JSON.stringify(row.url)}`
      ].join("\t")
    })
  }
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "bookmark",
    subcommand: "-list",
    records
  }
}

export function bookmarkPickerRowsFromListResult(listResult: ListResult): BookmarkPickerRow[] {
  const rows: BookmarkPickerRow[] = []
  for (const record of listResult.records) {
    if (record.kind === "bookmark.folder") {
      const bookmarkId = record.fields.bookmarkId
      if (typeof bookmarkId !== "string" || bookmarkId.length === 0) {
        continue
      }
      const parentId =
        typeof record.fields.parentId === "string" ? record.fields.parentId : ""
      const title =
        typeof record.fields.title === "string" && record.fields.title.length > 0
          ? record.fields.title
          : "(folder)"
      const depth =
        typeof record.fields.depth === "number" && Number.isInteger(record.fields.depth)
          ? Math.max(0, record.fields.depth)
          : (record.display?.indent ?? 0)
      rows.push({
        kind: "folder",
        bookmarkId,
        parentId,
        title,
        label: record.display?.label ?? title,
        depth
      })
      continue
    }
    if (record.kind === "bookmark.item") {
      const bookmarkId = record.fields.bookmarkId
      if (typeof bookmarkId !== "string" || bookmarkId.length === 0) {
        continue
      }
      const parentId =
        typeof record.fields.parentId === "string" ? record.fields.parentId : ""
      const url = typeof record.fields.url === "string" ? record.fields.url : ""
      const title =
        typeof record.fields.title === "string" && record.fields.title.length > 0
          ? record.fields.title
          : typeof record.fields.pageTitle === "string" && record.fields.pageTitle.length > 0
            ? record.fields.pageTitle
            : url.length > 0
              ? url
              : "(untitled)"
      const dateAdded =
        typeof record.fields.dateAdded === "number" && Number.isFinite(record.fields.dateAdded)
          ? record.fields.dateAdded
          : 0
      const depth =
        typeof record.fields.depth === "number" && Number.isInteger(record.fields.depth)
          ? Math.max(0, record.fields.depth)
          : (record.display?.indent ?? 0)
      rows.push({
        kind: "item",
        bookmarkId,
        parentId,
        title,
        url,
        dateAdded,
        depth
      })
    }
  }
  return rows
}
