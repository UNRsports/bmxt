import { setWindowDisplayName } from "../../extension-storage/window-display-names"

export async function applyWindowDisplayName(windowId: number, name: string): Promise<void> {
  await setWindowDisplayName(windowId, name)
}

export async function applyTabGroupTitle(groupId: number, title: string): Promise<void> {
  await chrome.tabGroups.update(groupId, { title: title.trim() })
}

export async function ungroupTabGroup(groupId: number): Promise<void> {
  const tabs = await chrome.tabs.query({ groupId })
  const ids = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
  if (ids.length === 0) {
    return
  }
  await chrome.tabs.ungroup(ids)
}

export async function removeTabGroup(groupId: number): Promise<void> {
  const tabs = await chrome.tabs.query({ groupId })
  const ids = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
  if (ids.length === 0) {
    return
  }
  await chrome.tabs.remove(ids)
}
