/**
 * EN: Apply a peer-requested bookmark mutation on this browser (IDs are local here).
 * JA: ピアからのブックマーク操作要求をこのブラウザの API で実行する（id はローカル）。
 */

import type { SyncBookmarksOp } from "../types.ts"

const MAX_IDS = 200
const MAX_TITLE = 512
const MAX_ID_LEN = 64
const BOOKMARK_ID_PATTERN = /^[A-Za-z0-9_-]+$/

function sanitizeBookmarkIds(ids: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of ids) {
    if (typeof raw !== "string") {
      continue
    }
    const id = raw.trim()
    if (id.length === 0 || id.length > MAX_ID_LEN) {
      continue
    }
    if (!BOOKMARK_ID_PATTERN.test(id)) {
      continue
    }
    out.push(id)
    if (out.length >= MAX_IDS) {
      break
    }
  }
  return out
}

function sanitizeParentId(raw: string | null): string | null {
  if (raw === null) {
    return null
  }
  const id = raw.trim()
  if (id.length === 0 || id.length > MAX_ID_LEN) {
    return null
  }
  if (!BOOKMARK_ID_PATTERN.test(id)) {
    return null
  }
  return id
}

function sanitizeTitle(raw: string): string {
  return raw.trim().slice(0, MAX_TITLE)
}

function isHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export async function applyRemoteBookmarksOps(
  op: SyncBookmarksOp
): Promise<{ ok: boolean; detail: string | null }> {
  try {
    if (op.kind === "create") {
      if (typeof op.url !== "string" || !isHttpsUrl(op.url)) {
        return { ok: false, detail: "bad_url" }
      }
      const title = sanitizeTitle(typeof op.title === "string" ? op.title : op.url)
      const parentId = sanitizeParentId(op.parentId)
      await chrome.bookmarks.create({
        url: op.url,
        title: title.length > 0 ? title : op.url,
        ...(parentId !== null ? { parentId } : {})
      })
      return { ok: true, detail: null }
    }
    if (op.kind === "create_folder") {
      const title = sanitizeTitle(typeof op.title === "string" ? op.title : "")
      if (title.length === 0) {
        return { ok: false, detail: "bad_title" }
      }
      const parentId = sanitizeParentId(op.parentId)
      await chrome.bookmarks.create({
        title,
        ...(parentId !== null ? { parentId } : {})
      })
      return { ok: true, detail: null }
    }
    if (op.kind === "remove") {
      const bookmarkIds = sanitizeBookmarkIds(op.bookmarkIds)
      if (bookmarkIds.length === 0) {
        return { ok: false, detail: "no_ids" }
      }
      for (const id of bookmarkIds) {
        try {
          const node = await chrome.bookmarks.get(id)
          const first = node[0]
          if (first !== undefined && first.url === undefined) {
            await chrome.bookmarks.removeTree(id)
          } else {
            await chrome.bookmarks.remove(id)
          }
        } catch {
          // EN: Skip missing or locked nodes individually.
        }
      }
      return { ok: true, detail: null }
    }
    if (op.kind === "move") {
      const bookmarkIds = sanitizeBookmarkIds(op.bookmarkIds)
      const parentId = sanitizeParentId(op.parentId)
      if (bookmarkIds.length === 0 || parentId === null) {
        return { ok: false, detail: "bad_move_args" }
      }
      const index =
        op.index !== null && Number.isInteger(op.index) && op.index >= 0 ? op.index : undefined
      for (const id of bookmarkIds) {
        try {
          await chrome.bookmarks.move(id, {
            parentId,
            ...(index !== undefined ? { index } : {})
          })
        } catch {
          // EN: Skip nodes that cannot move (missing / cycle).
        }
      }
      return { ok: true, detail: null }
    }
    const _exhaustive: never = op
    return { ok: false, detail: `unknown_op:${String(_exhaustive)}` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: message.slice(0, 200) }
  }
}
