import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "bookmark_remove" }>

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

export async function applyBookmarkRemoveEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const ids = parseIds(e.ids)
  if (ids === null) {
    return [effectT(ctx, "effect.bookmarkRemove.rejectedIds")]
  }
  const lines: string[] = []
  let removed = 0
  for (const id of ids) {
    try {
      await chrome.bookmarks.removeTree(id)
      removed += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      lines.push(effectT(ctx, "effect.bookmarkRemove.failedOne", { id, message }))
    }
  }
  lines.unshift(effectT(ctx, "effect.bookmarkRemove.ok", { count: String(removed) }))
  return lines
}
