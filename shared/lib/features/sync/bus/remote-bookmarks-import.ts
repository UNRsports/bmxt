/**
 * EN: Apply incoming bookmarks_import bus command on the local device.
 * JA: 受信した bookmarks_import コマンドをローカルデバイスに適用する。
 */

import { getSyncService } from "../facade/sync-service.ts"

const MAX_ITEMS = 500
const MAX_TITLE = 512
const MAX_PARENT = 64

function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function sanitizeParentId(raw: string | null): string | null {
  if (raw === null || raw.trim().length === 0) {
    return null
  }
  const trimmed = raw.trim()
  if (trimmed.length > MAX_PARENT) {
    return null
  }
  if (![...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))) {
    return null
  }
  return trimmed
}

/**
 * EN: Create bookmarks locally for each valid http(s) item in the list.
 * JA: リスト内の有効な http(s) アイテムをブックマークとしてローカルに作成する。
 */
export async function applyRemoteBookmarksImport(
  parentId: string | null,
  items: Array<{ url: string; title: string }>
): Promise<{ ok: boolean; detail: string | null; created: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, detail: "empty_items", created: 0 }
  }
  if (items.length > MAX_ITEMS) {
    return { ok: false, detail: "too_many_items", created: 0 }
  }
  const safeParentId = sanitizeParentId(parentId)

  let created = 0
  for (const item of items) {
    if (typeof item.url !== "string" || !isHttpsUrl(item.url)) {
      continue
    }
    const title = typeof item.title === "string" ? item.title.trim().slice(0, MAX_TITLE) : item.url
    try {
      await chrome.bookmarks.create({
        url: item.url,
        title: title.length > 0 ? title : item.url,
        ...(safeParentId !== null ? { parentId: safeParentId } : {})
      })
      created += 1
    } catch {
      // EN: Skip items that fail individually (e.g. duplicate or bad parentId).
      // JA: 個別失敗はスキップ（重複や無効な parentId など）。
    }
  }
  return { ok: created > 0, detail: null, created }
}

/**
 * EN: Send a bookmarks_import request to a remote device via the sync command bus.
 * JA: sync コマンドバス経由でリモートデバイスへ bookmarks_import リクエストを送る。
 */
export async function importRemoteBookmarks(
  deviceId: string,
  parentId: string | null,
  items: Array<{ url: string; title: string }>
): Promise<{ ok: boolean; lines: string[]; created: number }> {
  const service = getSyncService()
  return service.importBookmarks(deviceId, parentId, items)
}
