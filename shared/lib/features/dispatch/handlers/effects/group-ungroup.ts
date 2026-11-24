import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "group_ungroup" }>

export async function applyGroupUngroupEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const groupId = e.group_id
  if (!Number.isInteger(groupId) || groupId < 0) {
    return [effectT(ctx, "effect.groupUngroup.invalid", { groupId: String(groupId) })]
  }
  try {
    const tabs = await chrome.tabs.query({ groupId })
    const ids = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
    if (ids.length === 0) {
      return [effectT(ctx, "effect.groupUngroup.empty", { groupId: String(groupId) })]
    }
    await chrome.tabs.ungroup(ids)
    return [effectT(ctx, "effect.groupUngroup.done", { groupId: String(groupId) })]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [
      effectT(ctx, "effect.groupUngroup.failed", { groupId: String(groupId), reason })
    ]
  }
}
