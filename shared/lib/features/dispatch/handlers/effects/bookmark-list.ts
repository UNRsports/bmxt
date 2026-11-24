import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { resolveBookmarkEntriesForSearch } from "../../../search/cache/search-cache-store"
import { bookmarkPickerRowsToListResult } from "../../../bookmark/bookmark-list-result"
import { buildBookmarkPickerRowsFromEntries } from "../../../bookmark/picker-rows"
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
    // EN: Same bookmark.folder / bookmark.item records as `bookmark -list` (picker rows).
    // JA: `bookmark -list` と同じ bookmark.folder / bookmark.item レコード。
    const rows = buildBookmarkPickerRowsFromEntries(entries, { folderId })
    const list = bookmarkPickerRowsToListResult(rows)
    return formatListPlainLines(list)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.bookmarkList.failed", { message })]
  }
}
