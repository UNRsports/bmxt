import { getWindowDisplayName } from "../extension-storage/window-display-names"
import type { TabPickerRow } from "./picker-rows"
import { getPickerRowAtHi } from "./tab-picker-bulk-window"
import { chromeTabGroupIdsFromMarkedGroupKeys, groupRowKey } from "./tab-picker-keyboard"
import type { EditPanel } from "./tab-picker-overlay-types"
import type { SelectKind } from "./tab-picker-overlay-types"

export type EditTarget =
  | { kind: "window"; windowId: number }
  | { kind: "group"; windowId: number; groupId: number; groupKey: string }

export function resolveEditTarget(
  markedKind: SelectKind | null,
  markedWindowIds: number[],
  markedGroupKeys: string[],
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): EditTarget | null {
  if (markedKind === "tab") {
    return null
  }
  if (markedKind === "window") {
    if (markedWindowIds.length !== 1) {
      return null
    }
    return { kind: "window", windowId: markedWindowIds[0]! }
  }
  if (markedKind === "group") {
    if (markedGroupKeys.length !== 1) {
      return null
    }
    const ids = chromeTabGroupIdsFromMarkedGroupKeys(markedGroupKeys)
    if (ids.length !== 1) {
      return null
    }
    const groupId = ids[0]!
    const key = markedGroupKeys[0]!
    const colon = key.indexOf(":")
    const windowId = colon >= 0 ? Number(key.slice(0, colon)) : NaN
    if (!Number.isInteger(windowId)) {
      return null
    }
    return { kind: "group", windowId, groupId, groupKey: key }
  }

  const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
  if (row?.kind === "window") {
    return { kind: "window", windowId: row.windowId }
  }
  if (row?.kind === "group" && row.groupId !== null) {
    return {
      kind: "group",
      windowId: row.windowId,
      groupId: row.groupId,
      groupKey: groupRowKey(row.windowId, row.groupId)
    }
  }
  return null
}

export function editTargetErrorMessage(
  markedKind: SelectKind | null,
  markedWindowIds: number[],
  markedGroupKeys: string[],
  rows: TabPickerRow[],
  visibleRowIndices: number[],
  hi: number
): string | null {
  if (markedKind === "tab") {
    return "error: :edit はタブ行では使えません。ウィンドウ行またはタブグループ行を単体選択してください。"
  }
  if (markedKind === "window" && markedWindowIds.length > 1) {
    return "error: :edit はウィンドウを 1 つだけ選択したときに使えます。"
  }
  if (markedKind === "group" && markedGroupKeys.length > 1) {
    return "error: :edit はタブグループを 1 つだけ選択したときに使えます。"
  }
  if (markedKind === "group" && markedGroupKeys.length === 1) {
    const ids = chromeTabGroupIdsFromMarkedGroupKeys(markedGroupKeys)
    if (ids.length !== 1) {
      return "error: :edit はタブグループ行を 1 つだけ選択したときに使えます。"
    }
  }
  const row = getPickerRowAtHi(rows, visibleRowIndices, hi)
  if (resolveEditTarget(markedKind, markedWindowIds, markedGroupKeys, rows, visibleRowIndices, hi)) {
    return null
  }
  return "error: :edit はウィンドウ行またはタブグループ行を 1 つだけ選択したときに使えます。"
}

export async function buildInitialEditPanel(target: EditTarget): Promise<EditPanel> {
  if (target.kind === "window") {
    return { kind: "windowRename", windowId: target.windowId }
  }
  return {
    kind: "groupMenu",
    windowId: target.windowId,
    groupId: target.groupId,
    groupKey: target.groupKey,
    pickIndex: 0
  }
}

export async function loadEditTitleForPanel(panel: EditPanel): Promise<string> {
  if (panel.kind === "windowRename") {
    const custom = await getWindowDisplayName(panel.windowId)
    if (custom !== undefined) {
      return custom
    }
    const tabs = await chrome.tabs.query({ windowId: panel.windowId, active: true })
    return tabs[0]?.title?.trim() ?? ""
  }
  if (panel.kind === "groupRename") {
    try {
      const g = await chrome.tabGroups.get(panel.groupId)
      return (g.title ?? "").trim()
    } catch {
      return ""
    }
  }
  return ""
}
