import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "bookmark_move" }>

const MAX_ID = 64
const MAX_IDS = 200

function parseIds(raw: string): string[] | null {
  const parts = raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (parts.length === 0 || parts.length > MAX_IDS) {
    return null
  }
  for (const id of parts) {
    if (id.length > MAX_ID) {
      return null
    }
    if (![...id].every((c) => /[A-Za-z0-9_-]/.test(c))) {
      return null
    }
  }
  return parts
}

function sanitizeParentId(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_ID) {
    return null
  }
  if (![...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))) {
    return null
  }
  return trimmed
}

export async function applyBookmarkMoveEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const ids = parseIds(e.ids)
  if (ids === null) {
    return [effectT(ctx, "effect.bookmarkMove.rejectedIds")]
  }
  const parentId = sanitizeParentId(e.parent_id)
  if (parentId === null) {
    return [effectT(ctx, "effect.bookmarkMove.rejectedParent", { parentId: e.parent_id })]
  }
  let index: number | undefined
  const indexRaw = e.index.trim()
  if (indexRaw.length > 0) {
    const n = Number.parseInt(indexRaw, 10)
    if (!Number.isFinite(n) || n < 0) {
      return [effectT(ctx, "effect.bookmarkMove.rejectedIndex", { index: indexRaw })]
    }
    index = n
  }
  const lines: string[] = []
  let moved = 0
  for (const id of ids) {
    try {
      await chrome.bookmarks.move(id, {
        parentId,
        ...(index !== undefined ? { index } : {})
      })
      moved += 1
      if (index !== undefined) {
        index += 1
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      lines.push(effectT(ctx, "effect.bookmarkMove.failedOne", { id, message }))
    }
  }
  lines.unshift(effectT(ctx, "effect.bookmarkMove.ok", { count: String(moved) }))
  return lines
}
