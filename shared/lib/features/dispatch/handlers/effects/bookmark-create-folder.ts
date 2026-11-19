import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "bookmark_create_folder" }>

const MAX_TITLE = 512
const MAX_PARENT = 64

function sanitizeParentId(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }
  if (trimmed.length > MAX_PARENT) {
    return null
  }
  if (![...trimmed].every((c) => /[A-Za-z0-9_-]/.test(c))) {
    return null
  }
  return trimmed
}

export async function applyBookmarkCreateFolderEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const title = e.title.trim().slice(0, MAX_TITLE)
  if (title.length === 0) {
    return [effectT(ctx, "effect.bookmarkCreateFolder.rejectedTitle")]
  }
  const parentRaw = e.parent_id.trim()
  const parentId = parentRaw.length === 0 ? undefined : sanitizeParentId(parentRaw)
  if (parentRaw.length > 0 && parentId === null) {
    return [effectT(ctx, "effect.bookmarkCreateFolder.rejectedParent", { parentId: parentRaw })]
  }
  try {
    const created = await chrome.bookmarks.create({
      title,
      ...(parentId !== undefined ? { parentId } : {})
    })
    return [
      effectT(ctx, "effect.bookmarkCreateFolder.ok", {
        id: created.id,
        title: created.title ?? title
      })
    ]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.bookmarkCreateFolder.failed", { message })]
  }
}
