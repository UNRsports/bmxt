/**
 * EN: Bookmark folder listing and URL duplicate lookup (chrome.bookmarks).
 * JA: ブックマークフォルダ一覧と URL 重複検索（chrome.bookmarks）。
 */

import { resolveBookmarkEntriesForSearch } from "../search/cache/search-cache-store.ts"
import type { BookmarkCacheEntry } from "../search/cache/types.ts"

export type BookmarkFolderChoice = {
  /** EN: chrome.bookmarks folder id. */
  id: string
  /** EN: Display title (may be empty for unnamed folders). */
  title: string
  /** EN: Parent folder id; empty for roots. */
  parentId: string
}

export type BookmarkUrlMatch = {
  bookmarkId: string
  title: string
  url: string
  parentId: string
}

const MAX_PARENT_ID_LEN = 64

/** EN: True when `raw` looks like a chrome.bookmarks id (not a free-form title). */
export function looksLikeBookmarkId(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_PARENT_ID_LEN) {
    return false
  }
  return [...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))
}

export function sanitizeBookmarkParentId(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (!looksLikeBookmarkId(trimmed)) {
    return null
  }
  return trimmed
}

/**
 * EN: List bookmark folders (isFolder), sorted by title then id.
 * JA: フォルダのみを title → id 順で返す。
 */
export async function listBookmarkFolders(): Promise<BookmarkFolderChoice[]> {
  const entries = await resolveBookmarkEntriesForSearch()
  const folders: BookmarkFolderChoice[] = []
  for (const entry of entries) {
    if (!entry.isFolder) {
      continue
    }
    folders.push({
      id: entry.bookmarkId,
      title: entry.title,
      parentId: entry.parentId
    })
  }
  folders.sort((a, b) => {
    const titleCmp = a.title.localeCompare(b.title)
    if (titleCmp !== 0) {
      return titleCmp
    }
    return a.id.localeCompare(b.id)
  })
  return folders
}

/**
 * EN: Folder candidates for `--parent` — insert `id`, filter by title or id prefix.
 * JA: `--parent` 候補。行へ入れるのは id。title / id で絞り込み。
 */
export async function listBookmarkParentIdCandidates(prefix: string): Promise<
  Array<{ id: string; label: string }>
> {
  const folders = await listBookmarkFolders()
  const normalized = prefix.trim().toLowerCase()
  const out: Array<{ id: string; label: string }> = []
  for (const folder of folders) {
    const label =
      folder.title.trim().length > 0 ? `${folder.title} (${folder.id})` : `(id:${folder.id})`
    if (normalized.length === 0) {
      out.push({ id: folder.id, label })
      continue
    }
    const titleHit = folder.title.toLowerCase().includes(normalized)
    const idHit = folder.id.toLowerCase().startsWith(normalized)
    if (titleHit || idHit) {
      out.push({ id: folder.id, label })
    }
  }
  return out
}

/**
 * EN: Find existing bookmarks with the same URL (exact match after trim).
 * JA: 同一 URL（trim 後完全一致）の既存ブックマークを返す。
 */
export async function findBookmarksByUrl(url: string): Promise<BookmarkUrlMatch[]> {
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    return []
  }
  const entries = await resolveBookmarkEntriesForSearch()
  return matchesFromEntries(entries, trimmed)
}

function matchesFromEntries(
  entries: readonly BookmarkCacheEntry[],
  url: string
): BookmarkUrlMatch[] {
  const out: BookmarkUrlMatch[] = []
  for (const entry of entries) {
    if (entry.isFolder) {
      continue
    }
    if (entry.url !== url) {
      continue
    }
    out.push({
      bookmarkId: entry.bookmarkId,
      title: entry.title,
      url: entry.url,
      parentId: entry.parentId
    })
  }
  return out
}
