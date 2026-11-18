import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"
import { parseHttpUrlForEffect } from "../shared"

type E = Extract<HostEffect, { kind: "bookmark_create" }>

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

export async function applyBookmarkCreateEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const url = parseHttpUrlForEffect(e.url)
  if (!url) {
    return [effectT(ctx, "effect.bookmarkCreate.rejectedUrl", { url: e.url })]
  }
  const title = e.title.trim().slice(0, MAX_TITLE)
  const parentRaw = e.parent_id.trim()
  const parentId = parentRaw.length === 0 ? undefined : sanitizeParentId(parentRaw)
  if (parentRaw.length > 0 && parentId === null) {
    return [effectT(ctx, "effect.bookmarkCreate.rejectedParent", { parentId: parentRaw })]
  }
  try {
    const created = await chrome.bookmarks.create({
      url,
      title: title.length > 0 ? title : url,
      ...(parentId !== undefined ? { parentId } : {})
    })
    return [
      effectT(ctx, "effect.bookmarkCreate.ok", {
        id: created.id,
        url,
        title: created.title ?? title
      })
    ]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [effectT(ctx, "effect.bookmarkCreate.failed", { message })]
  }
}
