import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { findBookmarksByUrl, sanitizeBookmarkParentId } from "../../../bookmark/folders"
import { effectT } from "../effect-i18n"
import { parseHttpUrlForEffect } from "../shared"

type E = Extract<HostEffect, { kind: "bookmark_create" }>

const MAX_TITLE = 512

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
  const parentId = parentRaw.length === 0 ? undefined : sanitizeBookmarkParentId(parentRaw)
  if (parentRaw.length > 0 && parentId === null) {
    return [effectT(ctx, "effect.bookmarkCreate.rejectedParent", { parentId: parentRaw })]
  }

  const dupMode = e.dup_mode.trim().toLowerCase()
  if (dupMode !== "" && dupMode !== "force" && dupMode !== "skip") {
    return [effectT(ctx, "effect.bookmarkCreate.rejectedDupMode", { mode: e.dup_mode })]
  }

  if (dupMode !== "force") {
    const existing = await findBookmarksByUrl(url)
    if (existing.length > 0) {
      const head = existing[0]!
      if (dupMode === "skip") {
        return [
          effectT(ctx, "effect.bookmarkCreate.skippedDup", {
            id: head.bookmarkId,
            url,
            title: head.title.length > 0 ? head.title : url
          })
        ]
      }
      return [
        effectT(ctx, "effect.bookmarkCreate.dupExists", {
          id: head.bookmarkId,
          url,
          title: head.title.length > 0 ? head.title : url
        })
      ]
    }
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
