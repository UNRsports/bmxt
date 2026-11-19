import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveBookmarkEntriesForSearch } from "../../../search/cache/search-cache-store"
import { LIST_OUTPUT_SCHEMA, type ListRecord, type ListResult } from "../../../command-line/list-output/types"
import { formatListPlainLines } from "../../../command-line/list-output/format-plain-lines"

type E = Extract<HostEffect, { kind: "bookmark_list" }>

const MAX_FOLDER = 64

function sanitizeFolderId(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (trimmed.length > MAX_FOLDER) {
    return null
  }
  if (![...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))) {
    return null
  }
  return trimmed
}

function buildBookmarkListResult(
  folderId: string | null,
  entries: Awaited<ReturnType<typeof resolveBookmarkEntriesForSearch>>
): ListResult {
  const filtered =
    folderId === null
      ? entries.filter((e) => !e.isFolder || e.url.length === 0)
      : entries.filter((e) => e.parentId === folderId)

  const records: ListRecord[] = []
  let index = 0
  for (const entry of filtered) {
    index += 1
    if (entry.isFolder) {
      records.push({
        kind: "search.hit",
        fields: {
          index,
          source: "bookmark.folder",
          title: entry.title || "(folder)",
          url: "",
          tabId: null,
          hitCount: 0,
          pattern: "",
          bookmarkId: entry.bookmarkId,
          parentId: entry.parentId
        },
        display: {
          label: `[folder] ${entry.title || "(folder)"}`,
          detail: entry.bookmarkId
        }
      })
      continue
    }
    records.push({
      kind: "search.hit",
      fields: {
        index,
        source: "bookmark",
        title: entry.title || "(untitled)",
        url: entry.url,
        tabId: null,
        hitCount: 0,
        pattern: "",
        bookmarkId: entry.bookmarkId,
        parentId: entry.parentId,
        dateAdded: entry.dateAdded
      },
      display: {
        label: entry.title || entry.url,
        detail: entry.url
      }
    })
  }

  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "bookmark",
    subcommand: "-list",
    records
  }
}

/**
 * EN: Local bookmark tree list (optional folder filter). Cross-device scopes refuse here.
 * JA: ローカルブックマーク一覧。ピア横断はこの effect では拒否。
 */
export async function applyBookmarkListEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  if (e.device_scope === "peers" || e.device_scope === "device") {
    return [effectT(ctx, "effect.bookmarkList.requiresLocalOrSearch")]
  }

  const folderRaw = e.folder_id.trim()
  const folderId = folderRaw.length === 0 ? null : sanitizeFolderId(folderRaw)
  if (folderRaw.length > 0 && folderId === null) {
    return [effectT(ctx, "effect.bookmarkList.rejectedFolder", { folderId: folderRaw })]
  }

  try {
    const entries = await resolveBookmarkEntriesForSearch()
    const list = buildBookmarkListResult(folderId, entries)
    return formatListPlainLines(list)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.bookmarkList.failed", { message })]
  }
}
