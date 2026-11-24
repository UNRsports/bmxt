import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "group_rename" }>

export async function applyGroupRenameEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const groupId = e.group_id
  if (!Number.isInteger(groupId) || groupId < 0) {
    return [effectT(ctx, "effect.groupRename.invalid", { groupId: String(groupId) })]
  }
  const title = typeof e.title === "string" ? e.title.trim() : ""
  try {
    await chrome.tabGroups.update(groupId, { title })
    return [
      effectT(ctx, "effect.groupRename.done", {
        groupId: String(groupId),
        title: title.length > 0 ? title : "(empty)"
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [
      effectT(ctx, "effect.groupRename.failed", { groupId: String(groupId), reason })
    ]
  }
}
