import type { HostEffect } from "../../effect-types"
import type { DispatchHostContext } from "../../dispatch-context"
import { effectT } from "../effect-i18n"

type E = Extract<HostEffect, { kind: "close_group" }>

export async function applyCloseGroupEffect(
  ctx: DispatchHostContext,
  e: E
): Promise<string[]> {
  const groupId = e.group_id
  if (!Number.isInteger(groupId) || groupId < 0) {
    return [effectT(ctx, "effect.closeGroup.invalid", { groupId: String(groupId) })]
  }
  try {
    const tabs = await chrome.tabs.query({ groupId })
    const ids = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
    if (ids.length === 0) {
      return [effectT(ctx, "effect.closeGroup.empty", { groupId: String(groupId) })]
    }
    await chrome.tabs.remove(ids)
    return [
      effectT(ctx, "effect.closeGroup.done", {
        groupId: String(groupId),
        count: String(ids.length)
      })
    ]
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return [
      effectT(ctx, "effect.closeGroup.failed", { groupId: String(groupId), reason })
    ]
  }
}
