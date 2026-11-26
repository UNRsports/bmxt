/** EN: Bookmark picker flat rows (folder headers + items), tab-picker style. */

import type { BookmarkCacheEntry } from "../search/cache/types.ts"
import { resolveBookmarkEntriesForSearch } from "../search/cache/search-cache-store.ts"
import { displayTitle } from "../format/display-title.ts"
import type { UiLocale } from "../setting/locale.ts"
import { getRunLocale } from "../setting/i18n/run-locale.ts"
import {
  buildBookmarkPickerRowsFromEntriesWith,
  type BookmarkPickerRow
} from "./picker-rows-build.ts"

export type { BookmarkPickerRow } from "./picker-rows-build.ts"

export type BookmarkPickerRowsOptions = {
  /** EN: When set, emit only this folder and its descendants. */
  folderId?: string | null
  locale?: UiLocale
}

/**
 * EN: Build preorder folder/item rows from the bookmark cache (N-level tree).
 * JA: ブックマークキャッシュからフォルダ／項目の preorder 行を組み立てる。
 */
export function buildBookmarkPickerRowsFromEntries(
  entries: readonly BookmarkCacheEntry[],
  options: BookmarkPickerRowsOptions = {}
): BookmarkPickerRow[] {
  const locale = options.locale ?? getRunLocale()
  return buildBookmarkPickerRowsFromEntriesWith(entries, {
    folderId: options.folderId ?? null,
    formatFolderLabel: (title) => displayTitle(title, locale)
  })
}

export async function buildBookmarkPickerRows(
  options: BookmarkPickerRowsOptions = {}
): Promise<BookmarkPickerRow[]> {
  const entries = await resolveBookmarkEntriesForSearch()
  return buildBookmarkPickerRowsFromEntries(entries, options)
}
