/** EN: Focus / activate targets for tab picker Enter (same semantics as legacy confirmSelection). */

export type PickerFocusPlan =
  | { kind: "activateTab"; tabId: number; windowId: number }
  | { kind: "focusWindow"; windowId: number }
  | { kind: "activateFromGroup"; windowId: number; groupId: number | null }

/** EN: Apply plan via Chrome APIs; returns active tab id when known. */
export async function executePickerFocusPlan(plan: PickerFocusPlan): Promise<number | null> {
  try {
    if (plan.kind === "activateTab") {
      await chrome.tabs.update(plan.tabId, { active: true })
      await chrome.windows.update(plan.windowId, { focused: true })
      return plan.tabId
    }
    if (plan.kind === "focusWindow") {
      await chrome.windows.update(plan.windowId, { focused: true })
      return null
    }
    const tabs = await chrome.tabs.query({ windowId: plan.windowId })
    const inGroup = tabs.find((t) =>
      plan.groupId === null
        ? t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
        : t.groupId === plan.groupId
    )
    if (inGroup?.id !== undefined) {
      await chrome.tabs.update(inGroup.id, { active: true })
      await chrome.windows.update(plan.windowId, { focused: true })
      return inGroup.id
    }
  } catch {
    /* ignore */
  }
  return null
}
