/** EN: Focus / activate targets for tab picker Enter (same semantics as legacy confirmSelection). */

import { TAB_GROUP_ID_NONE } from "../../tabs/tab-groups-api"
import { hasWindowsApi } from "../../tabs/windows-api"

export type PickerFocusPlan =
  | { kind: "activateTab"; tabId: number; windowId: number }
  | { kind: "focusWindow"; windowId: number }
  | { kind: "activateFromGroup"; windowId: number; groupId: number | null }

async function focusWindowIfPossible(windowId: number): Promise<void> {
  if (!hasWindowsApi()) {
    return
  }
  await chrome.windows.update(windowId, { focused: true })
}

/** EN: Apply plan via Chrome APIs; returns active tab id when known. */
export async function executePickerFocusPlan(plan: PickerFocusPlan): Promise<number | null> {
  try {
    if (plan.kind === "activateTab") {
      await chrome.tabs.update(plan.tabId, { active: true })
      await focusWindowIfPossible(plan.windowId)
      return plan.tabId
    }
    if (plan.kind === "focusWindow") {
      await focusWindowIfPossible(plan.windowId)
      return null
    }
    const tabs = await chrome.tabs.query({ windowId: plan.windowId })
    const inGroup = tabs.find((t) =>
      plan.groupId === null
        ? t.groupId === TAB_GROUP_ID_NONE || t.groupId === undefined
        : t.groupId === plan.groupId
    )
    if (inGroup?.id !== undefined) {
      await chrome.tabs.update(inGroup.id, { active: true })
      await focusWindowIfPossible(plan.windowId)
      return inGroup.id
    }
  } catch {
    /* ignore */
  }
  return null
}
